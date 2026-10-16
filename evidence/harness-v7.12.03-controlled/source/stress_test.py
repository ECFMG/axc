#!/usr/bin/env python3
"""Offline stress checks and measured local scaling. Never calls a live model."""

import argparse
import copy
import io
import json
import random
import re
import sys
import tempfile
import time
import traceback
import tracemalloc
from contextlib import redirect_stderr
from pathlib import Path
from unittest.mock import patch

import workflow as w
from model_adapters import ModelError, MockAdapter, usage

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / 'workflow-config.json').read_text())
TASK = json.loads((ROOT / 'tasks-tune.json').read_text())['tasks'][0]


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def record_task(identity='stress', value='chlorophyll'):
    return dict(id=identity, category='stress', request='Requested fields: answer, audience',
                history=[dict(id='constraint', role='user', content='audience="beginner"')],
                documents=[dict(id='answer', text='answer=' + json.dumps(value), required=True)],
                tool_results=[], expected=dict(answer=value, audience='beginner'))


def assert_accounting(result, config):
    calls = result['calls']
    known = [call['usage'] for call in calls if call['usage'] is not None]
    require(result['summary']['total_tokens'] == sum(item['total_tokens'] for item in known), 'Token totals lost or duplicated')
    require(result['budget_used_or_reserved'] <= config['limits']['workflow_tokens'], 'Workflow budget bypassed')
    require(result['tool_calls_reserved'] <= config['limits']['tool_calls'], 'Tool limit bypassed')
    for call in calls:
        require(w.digest(call['request']) == call['request_hash'], 'Request snapshot mutated')
        require(call['preflight']['tokens'] + call['response_budget'] <= config['limits']['context_tokens'], 'Context ceiling bypassed')


def randomized_contexts(iterations, seed):
    randomizer = random.Random(seed)
    total_calls = 0
    for index in range(iterations):
        value = randomizer.choice(['café 🌱', '比例', True, 0, -27, ['a', 'b']])
        task = record_task('random-%s' % index, value)
        task['documents'] += [dict(id='copy-%s' % n, text=task['documents'][0]['text']) for n in range(randomizer.randrange(5))]
        task['documents'] += [dict(id='noise-%s' % n, text='irrelevant=42\n' * randomizer.randrange(1, 12)) for n in range(randomizer.randrange(15))]
        task['history'] += [dict(id='old', role='assistant', content='decision="keep units"\n' + 'Background. ' * 50,
                                 compactible=True, state=dict(decisions=['decision="keep units"'], constraints=[], unresolved=[], sources=[])),
                            dict(id='recent', role='assistant', content='Ready.'),
                            dict(id='override', role='user', content='audience="intermediate"')]
        task['expected']['audience'] = 'intermediate'
        randomizer.shuffle(task['documents'])
        original = copy.deepcopy(task)
        strategies = [name for name in w.STRATEGIES if randomizer.getrandbits(1)]
        w.validate(CONFIG, dict(split='eval', tasks=[task]))
        for active in ([], strategies):
            result = w.execute(task, CONFIG, active, MockAdapter(), 'random')
            require(result['initial_success'], 'Random case %s failed: %s' % (index, result['attempts']))
            require(task == original, 'Task source mutated')
            assert_accounting(result, CONFIG)
            total_calls += len(result['calls'])
    return dict(cases=iterations, workflow_runs=iterations * 2, model_calls=total_calls, seed=seed)


def budget_boundaries():
    cases = 0
    for output_cap in (1, 16, 128, 512):
        config = copy.deepcopy(CONFIG)
        config['model']['max_output_tokens'] = output_cap
        messages, _, _ = w.prepare(TASK, [], config)
        reservation = MockAdapter().count(dict(input=messages, tools=w.TOOLS))['tokens'] + output_cap
        for context_delta in (-1, 0, 1):
            for workflow_delta in (-1, 0, 1):
                config['limits'].update(context_tokens=reservation + context_delta, workflow_tokens=reservation + workflow_delta)
                result = w.execute(TASK, config, ['budgets'], MockAdapter(), 'boundary')
                assert_accounting(result, config)
                if result['calls']:
                    require(result['calls'][0]['preflight']['tokens'] + result['calls'][0]['response_budget'] <= config['limits']['context_tokens'], 'Reservation crossed context limit')
                cases += 1
    return dict(cases=cases)


def retry_storms():
    cases = 0
    for known in (False, True):
        for retries in (0, 1, 5, 25):
            class Failing(MockAdapter):
                def generate(self, request):
                    raise ModelError('injected retryable failure', True, usage(10, 2, 0, 'synthetic_estimate') if known else None)

            config = copy.deepcopy(CONFIG)
            config['limits']['retries'] = retries
            with patch.object(w.time, 'sleep'):
                result = w.execute(TASK, config, ['retrieve'], Failing(), 'retry-stress')
            require(len(result['calls']) == retries + 1, 'Retry limit not respected')
            require(not result['fallback'] and not result['success'], 'Provider outage triggered fallback or success')
            assert_accounting(result, config)
            if not known:
                require(result['summary']['estimated_cost_usd'] is None, 'Unknown charges reported as free')
            cases += 1
    return dict(cases=cases, max_attempts=26, backoff='sleep mocked; accounting and limits exercised')


def malformed_adapters():
    mutations = {
        'negative_input': lambda r: r['usage'].update(input_tokens=-1),
        'boolean_output': lambda r: r['usage'].update(output_tokens=True),
        'inconsistent_total': lambda r: r['usage'].update(total_tokens=1),
        'oversized_cache': lambda r: r['usage'].update(cached_tokens=10**9),
        'missing_usage_field': lambda r: r['usage'].pop('output_tokens'),
        'invalid_usage_source': lambda r: r['usage'].update(source='invented'),
        'invalid_items': lambda r: r.update(items=[None]),
        'invalid_text': lambda r: r.update(text=None),
    }
    failures = []
    for name, mutate in mutations.items():
        class Broken(MockAdapter):
            def generate(self, request):
                result = super().generate(request)
                mutate(result)
                return result

        try:
            result = w.execute(TASK, CONFIG, ['retrieve'], Broken(), name)
            require(not result['success'] and not result['fallback'], 'Malformed adapter result accepted or retried via fallback')
            require(len(result['calls']) == 1, 'Completed provider attempt disappeared from ledger')
            if name not in ('invalid_items', 'invalid_text'):
                require(result['calls'][0]['usage'] is None, 'Invalid usage trusted')
        except Exception as exc:
            failures.append(name + ': ' + type(exc).__name__ + ': ' + str(exc))
    require(not failures, '\n'.join(failures))
    return dict(cases=len(mutations))


def tool_flood_and_deadlines():
    class Flood(MockAdapter):
        def generate(self, request):
            result = super().generate(request)
            result['items'] = [dict(type='function_call', name='load_context', call_id=str(i), arguments='{}') for i in range(10000)]
            return result

    flooded = w.execute(TASK, CONFIG, ['retrieve'], Flood(), 'flood')
    require(not flooded['success'] and not flooded['fallback'], 'Tool flood did not stop')
    require(not any(event['kind'] == 'tool' for event in flooded['events']), 'Part of oversized batch executed')
    for timeout_stage in ('count', 'response'):
        clock = [0]

        class Late(MockAdapter):
            def count(self, request):
                if timeout_stage == 'count':
                    clock[0] = 301
                return super().count(request)

            def generate(self, request):
                result = super().generate(request)
                clock[0] = 301
                return result

        with patch.object(w.time, 'monotonic', side_effect=lambda: clock[0]):
            result = w.execute(TASK, CONFIG, ['retrieve'], Late(), 'deadline')
        require(not result['success'] and not result['fallback'], 'Deadline triggered further work')
        require(len(result['calls']) == (timeout_stage == 'response'), 'Late response usage lost or generation started after timeout')
    return dict(cases=3, rejected_tool_batch=10000)


def large_context():
    task = record_task('large-tool')
    task['documents'] = []
    task['tool_results'] = [dict(id='catalog', text='\n'.join(['noise=%s' % i for i in range(100000)] + ['answer="chlorophyll"']))]
    baseline = w.execute(task, CONFIG, [], MockAdapter(), 'large-baseline')
    require(not baseline['success'] and not baseline['calls'], 'Oversized baseline generated despite context ceiling')
    tracemalloc.start()
    started = time.perf_counter()
    optimized = w.execute(task, CONFIG, ['tool_limit'], MockAdapter(), 'large-optimized')
    elapsed = (time.perf_counter() - started) * 1000
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    require(optimized['initial_success'], 'Detail near end of large tool output was lost')
    require(any(event['kind'] == 'tool' and event['arguments'].get('ref') == 'tool:catalog'
                and 'answer="chlorophyll"' in event['output'] for event in optimized['events']),
            'Omitted detail was not recovered through the source handle')
    assert_accounting(optimized, CONFIG)
    huge_line = record_task('single-line')
    huge_line['tool_results'] = [dict(id='blob', text='x' * 1_000_000)]
    blocked = w.execute(huge_line, CONFIG, ['tool_limit'], MockAdapter(), 'single-line')
    require(not blocked['calls'] and not blocked['success'], 'Oversized line silently cut or allowed')
    return dict(tool_lines=100001, tool_bytes=len(task['tool_results'][0]['text'].encode()), latency_ms=elapsed,
                peak_python_bytes=peak, model_calls=len(optimized['calls']), oversized_single_line='blocked safely')


def context_scaling():
    measurements = []
    for size in (100, 1000, 5000):
        task = record_task('scale')
        task['documents'] += [dict(id='doc-%s' % i, text='irrelevant passage %s' % (i % 10)) for i in range(size)]
        task['history'] += [dict(id='history-%s' % i, role='assistant', compactible=True,
                                content='decision="retain source"\n' + 'Repeated background. ' * 30,
                                state=dict(decisions=['decision="retain source"'], constraints=[], unresolved=[], sources=[])) for i in range(size)]
        tracemalloc.start()
        started = time.perf_counter()
        messages, context, _ = w.prepare(task, list(w.STRATEGIES), CONFIG)
        elapsed = (time.perf_counter() - started) * 1000
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        require(dict(role='user', content='audience="beginner"') in messages, 'Early user constraint lost at scale')
        sources, recovered, start = w.sources_for(task), set(), 0
        while start < len(sources):
            page = w.read_detail(sources, dict(ref='catalog', query='', start=start, limit=100), 100, 4096)
            recovered.update(re.findall(r'\[ref=([^\]]+)\]', page))
            next_start = int(re.search(r'next_start=(\d+)', page).group(1))
            require(next_start > start, 'Catalog pagination stalled')
            start = next_start
        require(recovered == set(sources), 'Source handles lost at scale')
        measurements.append(dict(documents=size + 1, history_messages=size + 1, latency_ms=elapsed,
                                 peak_python_bytes=peak, prepared_bytes=len(w.encoded(messages).encode())))
    return dict(samples=measurements, note='Preparation only; catalog is bounded and all handles were recovered by paging. Required history may still exceed model context.')


def persistence_scaling():
    measurements = []
    config = copy.deepcopy(CONFIG)
    config['limits']['repetitions'] = 1
    with tempfile.TemporaryDirectory() as temp, redirect_stderr(io.StringIO()):
        for size in (10, 50, 100):
            tasks = [record_task('persist-%s' % i) for i in range(size)]
            started = time.perf_counter()
            directory = Path(temp) / str(size)
            report = w.benchmark(config, dict(split='eval', tasks=tasks), [], MockAdapter(), directory)
            elapsed = (time.perf_counter() - started) * 1000
            require(report['summary']['successes'] == size, 'Persistence run failed tasks')
            measurements.append(dict(workflows=size, wall_ms=elapsed,
                                     workflow_ms=report['summary']['latency_ms'],
                                     artifact_bytes=sum(path.stat().st_size for path in directory.iterdir())))
    return dict(samples=measurements, note='Temporary artifacts removed after measurement; wall time includes serialization/checkpoint overhead.')


def journal_failure():
    observed = []

    def unavailable(kind, row):
        observed.append(kind)
        if kind == 'call_finished':
            require(row['usage']['total_tokens'] > 0, 'Usage missing before journal write')
            raise OSError('injected disk write failure')

    try:
        w.execute(TASK, CONFIG, ['retrieve'], MockAdapter(), 'disk-failure', on_call=unavailable)
    except OSError:
        pass
    else:
        raise AssertionError('Journal failure ignored')
    require(observed == ['call_started', 'call_finished'], 'More calls started after storage failure')
    return dict(cases=1, stopped_after_calls=1)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--iterations', type=int, default=1000)
    parser.add_argument('--seed', type=int, default=72819)
    parser.add_argument('--out', type=Path, required=True, help='New report directory')
    args = parser.parse_args(argv)
    if args.iterations < 1:
        parser.error('--iterations must be positive')
    args.out.mkdir(parents=True, exist_ok=False)
    report = dict(label='OFFLINE STRESS: synthetic adapters; no live LLM savings or quality claims',
                  seed=args.seed, iterations=args.iterations, python=sys.version,
                  implementation_hash=w.implementation_hash(), config=CONFIG,
                  stress_script_hash=w.digest(Path(__file__).read_text()), scenarios=[])
    scenarios = [('randomized_contexts', lambda: randomized_contexts(args.iterations, args.seed)),
                 ('budget_boundaries', budget_boundaries), ('retry_storms', retry_storms),
                 ('malformed_adapters', malformed_adapters), ('tool_flood_and_deadlines', tool_flood_and_deadlines),
                 ('large_context', large_context), ('context_scaling', context_scaling),
                 ('persistence_scaling', persistence_scaling), ('journal_failure', journal_failure)]
    for name, run in scenarios:
        started = time.perf_counter()
        entry = dict(name=name)
        try:
            entry.update(passed=True, details=run())
        except Exception as exc:
            entry.update(passed=False, error=str(exc), traceback=traceback.format_exc())
        entry['wall_ms'] = (time.perf_counter() - started) * 1000
        report['scenarios'].append(entry)
        w.save(args.out / 'results.json', report)
        print(name + ': ' + ('PASS' if entry['passed'] else 'FAIL'))
    report['passed'] = all(entry['passed'] for entry in report['scenarios'])
    w.save(args.out / 'results.json', report)
    lines = ['# Offline harness stress test', '', report['label'], '',
             'Seed: %s. Randomized cases: %s. All scenarios passed: %s.' % (args.seed, args.iterations, report['passed'])]
    for entry in report['scenarios']:
        lines += ['', '## ' + entry['name'], '', 'Passed: %s. Wall time: %.3f ms.' % (entry['passed'], entry['wall_ms']),
                  '', '```json', json.dumps(entry.get('details', dict(error=entry.get('error'))), indent=2), '```']
    (args.out / 'report.md').write_text('\n'.join(lines) + '\n')
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    sys.exit(main())

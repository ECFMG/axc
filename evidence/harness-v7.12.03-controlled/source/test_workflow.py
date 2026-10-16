"""Focused offline checks. Run with python3 -B -m unittest -v."""

import copy
import io
import json
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from urllib.error import HTTPError
from unittest.mock import patch

import workflow as w
from model_adapters import ModelError, MockAdapter, OpenAIAdapter, usage

CONFIG = json.loads((w.ROOT / 'workflow-config.json').read_text())
DATA = json.loads((w.ROOT / 'tasks-eval.json').read_text())
TUNE = json.loads((w.ROOT / 'tasks-tune.json').read_text())


class WorkflowChecks(unittest.TestCase):
    def test_all_workflows_and_individual_strategies_preserve_success(self):
        w.validate(CONFIG, DATA)
        w.validate(CONFIG, TUNE)
        self.assertTrue({t['id'] for t in DATA['tasks']}.isdisjoint({t['id'] for t in TUNE['tasks']}))
        for strategies in [[], *[[s] for s in w.STRATEGIES], list(w.STRATEGIES)]:
            for task in DATA['tasks']:
                with self.subTest(strategies=strategies, task=task['id']):
                    result = w.execute(task, CONFIG, strategies, MockAdapter(), 'test')
                    self.assertTrue(result['initial_success'], result['attempts'])
                    self.assertFalse(result['fallback'])
                    self.assertTrue(all(c['task_success'] for c in result['calls']))

    def test_cost_cache_and_tool_tokens_are_not_double_counted(self):
        counts = usage(100, 20, 40, 'provider')
        self.assertAlmostEqual(w.cost(counts, CONFIG['pricing']), (60 + 4 + 80) / 1e6)
        adapter = MockAdapter()
        task = DATA['tasks'][2]
        first = w.execute(task, CONFIG, ['tool_limit'], adapter, 'same-scope')
        second = w.execute(task, CONFIG, ['tool_limit'], adapter, 'same-scope')
        self.assertEqual(first['cache_observed'], 'cold')
        self.assertEqual(second['cache_observed'], 'warm')
        self.assertEqual(len(first['calls']), 2)
        self.assertTrue(any(e['kind'] == 'tool' and e['name'] == 'read_detail' for e in first['events']))
        total = w.totals([first, second])
        all_calls = first['calls'] + second['calls']
        self.assertEqual(total['total_tokens'], sum(c['usage']['input_tokens'] + c['usage']['output_tokens'] for c in all_calls))
        self.assertGreater(total['tool_result_tokens_estimate'], 0)
        self.assertEqual(total['tokens_per_success'], total['total_tokens'] / 2)

    def test_retries_include_failed_attempt_usage_and_latency(self):
        class RetryOnce(MockAdapter):
            def __init__(self):
                super().__init__()
                self.failed = False

            def generate(self, request):
                if not self.failed:
                    self.failed = True
                    raise ModelError('transient', True, usage(10, 2, 0, 'synthetic_estimate'))
                return super().generate(request)

        with patch.object(w.time, 'sleep'):
            result = w.execute(TUNE['tasks'][0], CONFIG, [], RetryOnce(), 'retry')
        self.assertTrue(result['success'])
        self.assertEqual(len(result['calls']), 2)
        self.assertEqual(w.totals([result])['retries'], 1)
        self.assertEqual(result['calls'][0]['usage']['total_tokens'], 12)
        self.assertEqual(result['budget_used_or_reserved'], sum(c['usage']['total_tokens'] for c in result['calls']))
        self.assertTrue(all(c['latency_ms'] >= 0 for c in result['calls']))

    def test_unknown_failed_usage_is_not_reported_as_free(self):
        class Fails(MockAdapter):
            def generate(self, request):
                raise ModelError('timeout', True)

        config = copy.deepcopy(CONFIG)
        config['limits']['retries'] = 0
        result = w.execute(TUNE['tasks'][0], config, ['retrieve'], Fails(), 'timeout')
        self.assertFalse(result['success'])
        self.assertFalse(result['fallback'])
        self.assertGreater(result['budget_used_or_reserved'], 0)
        summary = w.totals([result])
        self.assertEqual(summary['unknown_usage_calls'], 1)
        self.assertIsNone(summary['estimated_cost_usd'])
        self.assertIsNone(summary['tokens_per_success'])

    def test_budget_blocks_calls_without_truncating_user_instructions(self):
        config = copy.deepcopy(CONFIG)
        config['limits']['context_tokens'] = 1
        result = w.execute(TUNE['tasks'][0], config, list(w.STRATEGIES), MockAdapter(), 'blocked')
        self.assertFalse(result['success'])
        self.assertEqual(result['calls'], [])
        self.assertEqual(len(result['attempts']), 2)
        self.assertTrue(all('not truncated' in a['reason'] for a in result['attempts']))
        config = copy.deepcopy(CONFIG)
        config['limits']['workflow_tokens'] = 1
        result = w.execute(TUNE['tasks'][0], config, [], MockAdapter(), 'blocked')
        self.assertEqual(result['calls'], [])
        self.assertIn('Workflow budget', result['attempts'][0]['reason'])

    def test_optimization_budget_falls_back_with_original_settings(self):
        config = copy.deepcopy(CONFIG)
        config['optimization']['response_tokens'] = 1
        result = w.execute(TUNE['tasks'][0], config, ['budgets'], MockAdapter(), 'fallback')
        self.assertFalse(result['initial_success'])
        self.assertTrue(result['success'])
        self.assertTrue(result['fallback'])
        self.assertEqual([c['stage'] for c in result['calls']], ['optimized', 'fallback'])
        self.assertEqual(result['calls'][1]['response_budget'], config['model']['max_output_tokens'])
        self.assertEqual(result['budget_used_or_reserved'], sum(c['usage']['total_tokens'] for c in result['calls']))
        self.assertEqual(w.totals([result])['initial_success_rate'], 0)

    def test_fallback_cannot_reset_workflow_budget(self):
        task, config = TUNE['tasks'][0], copy.deepcopy(CONFIG)
        config['optimization']['response_tokens'] = 1
        sample = w.execute(task, config, ['budgets'], MockAdapter(), 'size')
        config['limits']['workflow_tokens'] = sample['calls'][0]['usage']['total_tokens']
        result = w.execute(task, config, ['budgets'], MockAdapter(), 'limit')
        self.assertEqual(len(result['calls']), 1)
        self.assertFalse(result['success'])
        self.assertIn('Workflow budget', result['attempts'][-1]['reason'])

    def test_compaction_preserves_roles_constraints_state_and_sources(self):
        task = DATA['tasks'][1]
        original = copy.deepcopy(task)
        messages, _, event = w.prepare(task, ['compact_history'], CONFIG)
        for entry in task['history']:
            if entry['role'] != 'assistant':
                self.assertIn({'role': entry['role'], 'content': entry['content']}, messages)
            for values in entry.get('state', {}).values():
                for value in values:
                    self.assertTrue(any(value in m.get('content', '') for m in messages))
        self.assertEqual(task, original)
        self.assertTrue(event['changes'])
        full, _, _ = w.prepare(task, [], CONFIG)
        self.assertEqual(full[2:2 + len(task['history'])], [{'role': h['role'], 'content': h['content']} for h in task['history']])
        early = DATA['tasks'][3]
        messages, _, _ = w.prepare(early, ['compact_history'], CONFIG)
        self.assertIn({'role': 'assistant', 'content': early['history'][2]['content']}, messages)

    def test_required_context_survives_and_omitted_details_are_retrievable(self):
        _, context, _ = w.prepare(DATA['tasks'][3], ['retrieve', 'deduplicate'], CONFIG)
        self.assertIn('approved_source="handbook:v7"', context)
        for ref in w.sources_for(DATA['tasks'][3]):
            self.assertIn('[ref=' + ref + ']', context)
        task = DATA['tasks'][2]
        _, preview, _ = w.prepare(task, ['tool_limit'], CONFIG)
        self.assertIn('catalog_version="2026-09"', preview)
        self.assertNotIn('lesson_42_topic="photosynthesis"', preview)
        detail = w.read_detail(w.sources_for(task), dict(ref='tool:lesson-catalog', query='lesson_42_topic', start=0, limit=5), 20)
        self.assertIn('lesson_42_topic="photosynthesis"', detail)
        self.assertIn('next_start=', detail)

    def test_comparison_rejects_unfair_or_hidden_quality_regressions(self):
        config = copy.deepcopy(CONFIG)
        config['limits']['repetitions'] = 1
        config['optimization']['response_tokens'] = 1
        with tempfile.TemporaryDirectory() as temp, redirect_stderr(io.StringIO()):
            baseline = w.benchmark(config, TUNE, [], MockAdapter(), Path(temp) / 'base')
            candidate = w.benchmark(config, TUNE, ['budgets'], MockAdapter(), Path(temp) / 'candidate')
        result = w.compare(baseline, candidate)
        self.assertFalse(result['accepted'])
        self.assertIn('fallback rate exceeds threshold', result['flags'])
        self.assertTrue(any('initial task success' in flag for flag in result['flags']))
        candidate['config'] = copy.deepcopy(candidate['config'])
        candidate['config']['model']['temperature'] = 0.8
        with self.assertRaises(ValueError):
            w.compare(baseline, candidate)

    def test_openai_contract_uses_reported_usage_and_keeps_tool_items(self):
        body = {'model': 'test', 'input': [], 'tools': w.TOOLS, 'max_output_tokens': 100}
        response = {'model': 'test-snapshot', 'status': 'completed', 'id': 'resp',
                    'output': [{'type': 'function_call', 'name': 'read_detail', 'call_id': 'call', 'arguments': '{}'}],
                    'usage': {'input_tokens': 80, 'output_tokens': 20, 'total_tokens': 100,
                              'input_tokens_details': {'cached_tokens': 30}, 'output_tokens_details': {'reasoning_tokens': 10}}}
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test'}):
            adapter = OpenAIAdapter()
        with patch.object(adapter, 'post', return_value=response) as posted:
            result = adapter.generate(body)
        self.assertEqual(result['usage']['source'], 'provider')
        self.assertEqual(result['usage']['total_tokens'], 100)
        self.assertEqual(result['usage']['cached_tokens'], 30)
        self.assertEqual(result['items'], response['output'])
        self.assertFalse(posted.call_args.args[1]['store'])
        self.assertIn('reasoning.encrypted_content', posted.call_args.args[1]['include'])

    def test_provider_error_usage_is_kept_and_missing_usage_is_labeled(self):
        raw = {'usage': {'input_tokens': 10, 'output_tokens': 2, 'total_tokens': 12}}
        error = HTTPError('https://api.openai.com/v1/responses', 429, 'limited', {}, io.BytesIO(json.dumps(raw).encode()))
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test'}):
            adapter = OpenAIAdapter()
            with patch('model_adapters.urlopen', side_effect=error):
                with self.assertRaises(ModelError) as caught:
                    adapter.post('responses', {})
        self.assertTrue(caught.exception.retryable)
        self.assertEqual(caught.exception.usage['total_tokens'], 12)
        self.assertEqual(caught.exception.usage['source'], 'provider')
        with patch.object(adapter, 'post', return_value={'status': 'completed', 'output': []}):
            response = adapter.generate({'input': [], 'tools': w.TOOLS})
        self.assertEqual(response['usage']['source'], 'estimated')

    def test_provider_overrun_stops_without_fallback(self):
        class Overflow(MockAdapter):
            def generate(self, request):
                result = super().generate(request)
                result['usage']['input_tokens'] += 1
                result['usage']['total_tokens'] += 1
                return result

        result = w.execute(TUNE['tasks'][0], CONFIG, ['retrieve'], Overflow(), 'overrun')
        self.assertFalse(result['success'])
        self.assertFalse(result['fallback'])
        self.assertEqual(len(result['calls']), 1)
        self.assertIn('exceeded token reservation', result['attempts'][0]['reason'])

    def test_timeout_configuration_and_http_timeout(self):
        for key in ('request_timeout_seconds', 'workflow_timeout_seconds'):
            for value in (0, -1, True, float('nan'), float('inf')):
                config = copy.deepcopy(CONFIG)
                config['limits'][key] = value
                with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                    w.validate(config, DATA)
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test'}):
            adapter = OpenAIAdapter(2.5)
            with patch('model_adapters.urlopen', return_value=io.BytesIO(b'{}')) as opened:
                adapter.post('responses', {})
            self.assertEqual(opened.call_args.kwargs['timeout'], 2.5)

    def test_deadline_after_count_prevents_generation_and_fallback(self):
        clock = [0]

        class SlowCount(MockAdapter):
            def count(self, request):
                clock[0] = 2
                return super().count(request)

            def generate(self, request):
                raise AssertionError('Must stop before generation')

        config = copy.deepcopy(CONFIG)
        config['limits']['workflow_timeout_seconds'] = 1
        with patch.object(w.time, 'monotonic', side_effect=lambda: clock[0]):
            result = w.execute(TUNE['tasks'][0], config, ['retrieve'], SlowCount(), 'timeout')
        self.assertFalse(result['success'])
        self.assertFalse(result['fallback'])
        self.assertEqual(result['calls'], [])
        self.assertIn('timeout', result['attempts'][0]['reason'])

    def test_late_response_keeps_usage_and_stops(self):
        clock = [0]

        class SlowResponse(MockAdapter):
            def generate(self, request):
                clock[0] = 2
                return super().generate(request)

        config = copy.deepcopy(CONFIG)
        config['limits']['workflow_timeout_seconds'] = 1
        with patch.object(w.time, 'monotonic', side_effect=lambda: clock[0]):
            result = w.execute(TUNE['tasks'][0], config, ['retrieve'], SlowResponse(), 'timeout')
        self.assertFalse(result['success'])
        self.assertFalse(result['fallback'])
        self.assertEqual(len(result['calls']), 1)
        self.assertGreater(result['summary']['total_tokens'], 0)
        self.assertEqual(result['budget_used_or_reserved'], result['summary']['total_tokens'])

    def test_tool_cap_rejects_batch_and_is_shared_with_fallback(self):
        class ToolBatch(MockAdapter):
            def generate(self, request):
                result = super().generate(request)
                result['items'] = [dict(type='function_call', name='load_context', arguments='{}', call_id=str(i)) for i in range(2)]
                return result

        config = copy.deepcopy(CONFIG)
        config['limits']['tool_calls'] = 2
        result = w.execute(TUNE['tasks'][0], config, ['retrieve'], ToolBatch(), 'batch')
        self.assertFalse(result['fallback'])
        self.assertIn('tool-call limit', result['attempts'][0]['reason'])
        self.assertEqual(result['tool_calls_reserved'], 1)
        self.assertFalse(any(e['kind'] == 'tool' for e in result['events']))
        config['limits']['tool_calls'] = 1
        config['optimization']['response_tokens'] = 1
        result = w.execute(TUNE['tasks'][0], config, ['budgets'], MockAdapter(), 'shared')
        self.assertTrue(result['fallback'])
        self.assertFalse(result['success'])
        self.assertEqual(len(result['calls']), 1)
        self.assertEqual(result['tool_calls_reserved'], 1)
        self.assertIn('tool-call limit', result['attempts'][-1]['reason'])

    def test_snapshots_and_journal_reconstruct_requests_and_outcomes(self):
        config = copy.deepcopy(CONFIG)
        config['limits']['repetitions'] = 1
        data = dict(split='eval', tasks=[DATA['tasks'][2]])
        with tempfile.TemporaryDirectory() as temp, redirect_stderr(io.StringIO()):
            directory = Path(temp) / 'run'
            report = w.benchmark(config, data, ['tool_limit'], MockAdapter(), directory)
            self.assertEqual(json.loads((directory / 'tasks.json').read_text()), data)
            self.assertEqual(json.loads((directory / 'config.json').read_text()), config)
            self.assertEqual(w.digest(json.loads((directory / 'protocol.json').read_text())), report['protocol_hash'])
            events = [json.loads(line) for line in (directory / 'calls.jsonl').read_text().splitlines()]
        calls = report['workflows'][0]['calls']
        self.assertEqual(len(calls), 2)
        self.assertLess(len(calls[0]['request']['input']), len(calls[1]['request']['input']))
        for call in calls:
            self.assertEqual(w.digest(call['request']), call['request_hash'])
            self.assertNotIn('expected', call['request'])
            started = next(e for e in events if e['kind'] == 'call_started' and e['call_index'] == call['call_index'])
            finished = next(e for e in events if e['kind'] == 'call_finished' and e['call_index'] == call['call_index'])
            self.assertEqual(started['request'], call['request'])
            self.assertEqual(finished['usage'], call['usage'])
        self.assertEqual(events[-1]['kind'], 'workflow_finished')
        self.assertTrue(events[-1]['success'])

    def test_interrupted_workflow_keeps_completed_usage_and_marks_inflight_unknown(self):
        class Interrupted(MockAdapter):
            def __init__(self):
                super().__init__()
                self.calls = 0

            def generate(self, request):
                self.calls += 1
                if self.calls == 2:
                    raise KeyboardInterrupt()
                return super().generate(request)

        with tempfile.TemporaryDirectory() as temp, redirect_stderr(io.StringIO()):
            directory = Path(temp) / 'interrupted'
            with self.assertRaises(KeyboardInterrupt):
                w.benchmark(CONFIG, dict(split='eval', tasks=[DATA['tasks'][2]]), ['tool_limit'], Interrupted(), directory)
            report = json.loads((directory / 'results.json').read_text())
            events = [json.loads(line) for line in (directory / 'calls.jsonl').read_text().splitlines()]
        self.assertEqual(report['status'], 'interrupted')
        self.assertEqual([e['kind'] for e in events], ['call_started', 'call_finished', 'call_started'])
        self.assertGreater(events[1]['usage']['total_tokens'], 0)
        self.assertNotIn('usage', events[2])
        baseline = copy.deepcopy(report)
        baseline['strategies'] = []
        with self.assertRaisesRegex(ValueError, 'Incomplete run'):
            w.compare(baseline, report)


if __name__ == '__main__':
    unittest.main()

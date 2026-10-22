"""Controlled controller integration: recorded adapters, real Git and Python gates."""
import contextlib
import copy
import hashlib
import io
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

import coding_agent
import coding_task
from coding_workflow import finish
from controlled_workflow import CONTROL_NAMES, SCOPE, review
from run_budget import SharedBudget
from run_task_a import record_result
from test_efficiency_release import git, repository


FILES = {'apps/api/course.test.ts': 'import assert from "node:assert/strict";\nassert.equal(2 + 2, 4);\n',
         'apps/docs/courses.md': '# Fixture courses\nThe fixture is checked locally.\n'}
PARENT_HISTORY = 'PRIVATE_PARENT_CONVERSATION_MUST_NEVER_REACH_REVIEW'


def read_json(path):
    return json.loads(Path(path).read_text())


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def fixture(root, *, execution='version_adapter', token_budget=10000, max_calls=6):
    """Adapt the native fixture, setting the complete task before begin freezes it."""
    repo = repository(root)
    (repo / 'spec.md').write_text('Fixed specification: add the fixture test and documentation.')
    git(repo, 'add', '.')
    git(repo, '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'spec')
    marker = root / 'final-gates.txt'
    checks = []
    for index in range(8):
        script = ('from pathlib import Path;'
                  f'p=Path({str(marker)!r});'
                  f'p.write_text((p.read_text() if p.exists() else "")+{str(index) + chr(10)!r});'
                  f'expected={FILES!r};'
                  'assert all(Path(name).read_text().startswith(text) for name,text in expected.items())')
        checks.append([sys.executable, '-c', script])
    settings = {'model': 'fixture-model', 'temperature': 0, 'timeout_seconds': 5,
                'context_tokens': 32768, 'max_output_tokens': 256,
                'token_budget': token_budget, 'max_calls': max_calls}
    task = {'id': 'controlled-fixture-not-live-task-a', 'version': 'controlled-fixture',
            'spec': 'spec.md', 'prompt': 'Add the exact fixture test and documentation.',
            'allowed_paths': ['apps/api/', 'apps/docs/'], 'settings': settings,
            'controlled_workflow': {'required': True}, 'action_batch_size': 2,
            'focused_local_validation': True, 'execution_environment': {'passed': True},
            'checks': checks,
            'implementation_steps': [{'path': name, 'instruction': 'Add ' + name} for name in FILES]}
    definition = root / 'task.json'
    definition.write_text(json.dumps(task))
    out = root / 'evidence'
    frozen = out / 'frozen'
    frozen.mkdir(parents=True)
    for source in Path(__file__).resolve().parent.iterdir():
        if source.is_file() and source.suffix in ('.py', '.mjs', '.json', '.md'):
            shutil.copy2(source, frozen / source.name)
    state = coding_task.begin(repo, definition, out / 'run')
    source_hashes = {p.name: digest(p) for p in frozen.iterdir() if p.suffix in ('.py', '.mjs')}
    verification_sha = hashlib.sha256(b'{}').hexdigest()
    tools = {'python': sys.version.split()[0]}
    protocol = {'expected_repetitions': 2, 'base_commit': state['base_commit'],
                'prompt_sha256': state['prompt_sha256'], 'spec_sha256': state['spec_sha256'],
                'settings': settings, 'tool_versions': tools, 'accounting_scope': SCOPE,
                'verification_sha256': verification_sha, 'source_hashes': source_hashes}
    protocol_sha = hashlib.sha256(json.dumps(protocol, sort_keys=True).encode()).hexdigest()
    (out / 'protocol.json').write_text(json.dumps(protocol))
    (out / 'trial.json').write_text(json.dumps({
        'label': task['version'], 'execution': execution, 'environment_ready': True,
        'acceptance_sha256': verification_sha, 'tool_versions': tools,
        'report_template_sha256': digest(frozen / 'EVALUATION_RUN_RECORD_TEMPLATE.md'),
        'settings': settings, 'cache_policy': 'cold', 'source_hashes': source_hashes,
        'repetition': 1, 'expected_repetitions': 2, 'protocol_sha256': protocol_sha,
        'context_variant': 'relevant_context',
        'control_mode': 'controller_enforced' if execution == 'version_adapter' else 'external_advisory'}))
    return repo, out, marker


def response(text, *, status='completed', incoming=40, outgoing=11):
    return {'text': text, 'status': status, 'model': 'fixture-model',
            'provider_duration_ns': 1000,
            'usage': {'input_tokens': incoming, 'output_tokens': outgoing,
                      'total_tokens': incoming + outgoing, 'cached_tokens': 4,
                      'reasoning_output_tokens': 2, 'source': 'provider'}}


def implementation():
    return response(json.dumps({'path': '', 'content': '', 'edits': [],
                                'read_files': [], 'validate': False,
                                'files': [{'path': name, 'content': text, 'edits': []}
                                          for name, text in FILES.items()]}))


def clean_review():
    return response(json.dumps({'findings': [], 'missing_evidence': [], 'scope_complete': True}),
                    incoming=32, outgoing=9)


class RecordedAdapter:
    """Only the adapter boundary is mocked; dispatch and accounting stay real."""
    def __init__(self, responses):
        self.responses = list(responses)
        self.requests = []
        self.reset_models = []

    def reset_cache(self, model):
        self.reset_models.append(model)
        return {'model': model, 'verified': True, 'policy': 'fixture-cold'}

    def count(self, request):
        return {'tokens': 128, 'source': 'fixture-bound'}

    def generate(self, request):
        self.requests.append(copy.deepcopy(request))
        if not self.responses:
            raise AssertionError('Unexpected extra model call')
        return copy.deepcopy(self.responses.pop(0))


def run_primary(out, responses=None):
    primary = RecordedAdapter(responses if responses is not None else [implementation()])
    original_command = coding_task.command
    local_marker = out / 'local-gates.txt'
    local_gate = [sys.executable, '-c',
                  'from pathlib import Path;'
                  f'p=Path({str(local_marker)!r});'
                  'p.write_text((p.read_text() if p.exists() else "")+"x")']

    def fixture_command(argv, repo, log, timeout, **kwargs):
        # Execute local repair stages without requiring Node, pnpm or a server.
        return original_command(local_gate if argv[0] == 'pnpm' else argv,
                                repo, log, timeout, **kwargs)

    with patch('coding_agent.JsonAdapter', return_value=primary), \
            patch('coding_agent.coding_task.command', side_effect=fixture_command), \
            contextlib.redirect_stdout(io.StringIO()):
        result = coding_agent.run(out / 'run', 'relevant_context')
    return primary, result


class ControlledWorkflowIntegration(unittest.TestCase):
    def assert_all_gates(self, out, marker, runs=1, *, passed=True):
        self.assertEqual(marker.read_text().splitlines(), [str(i) for i in range(8)] * runs)
        result = read_json(out / 'run/result.json')
        self.assertEqual(len(result['checks']), 8)
        self.assertEqual(result['passed'], passed)
        self.assertEqual(len(list((out / 'run').glob('validation-*'))), runs)
        for row in result['checks']:
            self.assertEqual(row['argv'][0], sys.executable)
            self.assertEqual(row['exit_code'], 0 if passed else 1)

    def test_executed_primary_review_and_deterministic_report_share_one_complete_budget(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo, out, marker = fixture(Path(tmp))
            attempts = [response(PARENT_HISTORY, status='incomplete'),
                        response('malformed JSON ' + PARENT_HISTORY), implementation()]
            primary, result = run_primary(out, attempts)
            self.assertTrue(result['passed_local_checks'])
            self.assertFalse(marker.exists())
            self.assertEqual((out / 'local-gates.txt').read_text(), 'xxx')
            self.assertFalse(SharedBudget(out / 'run/shared-budget.json').snapshot()['complete'])
            reviewer = RecordedAdapter([clean_review()])
            with patch('controlled_workflow.ReviewAdapter', return_value=reviewer), \
                    patch('ollama_adapter.OllamaAdapter.generate', side_effect=AssertionError('Live model call')):
                summary = finish(out)
            self.assertTrue(summary['passed'])
            self.assertTrue(summary['validation_passed'])
            self.assertTrue(summary['controlled_eligible'])
            self.assertTrue(summary['reviewer_executed'])
            self.assert_all_gates(out, marker)
            record = read_json(out / 'comparison-record.json')
            budget = record['budget']
            self.assertEqual(set(budget['actors']), {'primary', 'reviewer', 'reporting'})
            self.assertTrue(all(row['complete'] for row in budget['actors'].values()))
            self.assertTrue(budget['actors']['reporting']['deterministic'])
            self.assertEqual(budget['actors']['reporting']['measured_tokens'], 0)
            self.assertEqual(budget['measured_tokens'], 3 * 51 + 41)
            self.assertEqual(summary['measured_total_tokens'], budget['measured_tokens'])
            self.assertEqual([row['actor'] for row in record['ledger']['calls']],
                             ['primary', 'primary', 'primary', 'reviewer'])
            self.assertEqual([row['status'] for row in record['ledger']['calls']],
                             ['incomplete', 'completed', 'completed', 'completed'])
            self.assertEqual([row['sequence'] for row in record['ledger']['calls']], [1, 2, 3, 4])
            self.assertEqual(len(primary.requests) + len(reviewer.requests), 4)
            self.assertEqual(record['ledger']['calls'], budget['calls'])
            self.assertEqual(read_json(out / 'reported-provider-usage.json'), record['ledger'])
            self.assertTrue(record['ledger']['complete'])
            self.assertTrue(all(record['controls'][name] for name in CONTROL_NAMES))
            self.assertTrue(read_json(out / 'run/controlled-review.json')['passed'])
            self.assertEqual(record['conditions']['protocol_sha256'], read_json(out / 'trial.json')['protocol_sha256'])

    def test_fresh_review_has_complete_task_and_current_diff_but_no_parent_history(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, out, marker = fixture(Path(tmp))
            primary, _ = run_primary(out, [response(PARENT_HISTORY), implementation()])
            reviewer = RecordedAdapter([clean_review()])
            with patch('controlled_workflow.ReviewAdapter', return_value=reviewer) as constructor:
                self.assertTrue(finish(out)['controlled_eligible'])
            constructor.assert_called_once_with(context_tokens=32768, timeout_seconds=5)
            self.assertEqual(len(primary.requests), 2)
            request, = reviewer.requests
            self.assertEqual(set(request), {'model', 'instructions', 'input', 'temperature', 'max_output_tokens'})
            self.assertEqual(len(request['input']), 1)
            self.assertEqual(request['input'][0]['role'], 'user')
            packet = request['input'][0]['content']
            self.assertIn('Fixed specification: add the fixture test and documentation.', packet)
            self.assertIn('Add the exact fixture test and documentation.', packet)
            self.assertIn('PATH: apps/api/course.test.ts', packet)
            self.assertIn(FILES['apps/api/course.test.ts'].strip(), packet)
            self.assertNotIn(PARENT_HISTORY, json.dumps(request))
            self.assertIn('no parent conversation is supplied', request['instructions'])
            handoff = read_json(out / 'review-handoff.json')
            self.assertEqual(handoff['spawn_agent']['fork_turns'], 'none')
            event = next(e for e in read_json(out / 'run/controls.json')['events']
                         if e['control'] == 'fresh_review_executed')
            self.assertFalse(event['history_inherited'])
            self.assertEqual(event['packet_sha256'], hashlib.sha256(packet.encode()).hexdigest())
            self.assert_all_gates(out, marker)

    def test_reviewer_reservation_exhaustion_retains_primary_cost_and_runs_all_final_gates(self):
        for limits in ({'token_budget': 400}, {'max_calls': 1}):
            with self.subTest(limits=limits), tempfile.TemporaryDirectory() as tmp:
                _, out, marker = fixture(Path(tmp), **limits)
                primary, result = run_primary(out)
                self.assertTrue(result['passed_local_checks'])
                reviewer = RecordedAdapter([clean_review()])
                with patch('controlled_workflow.ReviewAdapter', return_value=reviewer):
                    summary = finish(out)
                self.assertTrue(summary['validation_passed'])
                self.assertFalse(summary['passed'])
                self.assertFalse(summary['controlled_eligible'])
                self.assert_all_gates(out, marker)
                record = read_json(out / 'comparison-record.json')
                self.assertTrue(record['budget']['budget_exhausted'])
                self.assertFalse(record['budget']['complete'])
                self.assertEqual(record['budget']['measured_tokens'], 51)
                self.assertEqual(record['budget']['denied_reservations'][0]['actor'], 'reviewer')
                self.assertEqual(len(primary.requests), 1)
                self.assertEqual(reviewer.requests, [])
                self.assertEqual(len(record['ledger']['calls']), 1)
                self.assertFalse(record['controls'].get('fresh_review_executed', False))

    def test_external_host_counters_and_validation_never_establish_controller_controls(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo, out, marker = fixture(Path(tmp), execution='external_host')
            for name, content in FILES.items():
                target = repo / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(content)
            ledger = {'complete': True, 'calls': [{**clean_review()['usage'], 'model': 'fixture-model'}]}
            imported = out / 'imported-usage.json'
            imported.write_text(json.dumps(ledger))
            # A native host cannot promote copied or asserted receipts into enforced controls.
            (out / 'run/controls.json').write_text(json.dumps({
                'mode': 'controller_enforced', **dict.fromkeys(CONTROL_NAMES, True)}))
            with patch('controlled_workflow.ReviewAdapter') as adapter:
                summary = finish(out, usage_file=imported)
            self.assertTrue(summary['validation_passed'])
            self.assertTrue(summary['usage_complete'])
            self.assertFalse(summary['controlled_eligible'])
            self.assertFalse(summary['passed'])
            self.assert_all_gates(out, marker)
            record = read_json(out / 'comparison-record.json')
            self.assertEqual(record['ledger'], ledger)
            self.assertEqual(record['controls']['mode'], 'external_advisory')
            self.assertTrue(all(record['controls'][name] is False for name in CONTROL_NAMES))
            adapter.assert_not_called()
            with self.assertRaisesRegex(ValueError, 'native-host review is advisory'):
                review(out)

    def test_review_findings_missing_evidence_and_bad_responses_block_quality_but_keep_cost(self):
        cases = {
            'findings': response(json.dumps({'findings': ['apps/api/course.test.ts:1 fixture finding'],
                                            'missing_evidence': [], 'scope_complete': True})),
            'missing evidence': response(json.dumps({'findings': [], 'missing_evidence': ['Unobserved case'],
                                                    'scope_complete': True})),
            'truncated': response('{"findings":', status='incomplete'),
            'malformed JSON': response('not JSON'),
            'malformed schema': response(json.dumps({'findings': 'not an array',
                                                    'missing_evidence': [], 'scope_complete': True})),
        }
        for name, reply in cases.items():
            with self.subTest(response=name), tempfile.TemporaryDirectory() as tmp:
                _, out, marker = fixture(Path(tmp))
                run_primary(out)
                reviewer = RecordedAdapter([reply])
                with patch('controlled_workflow.ReviewAdapter', return_value=reviewer):
                    summary = finish(out)
                self.assertTrue(summary['validation_passed'])
                self.assertFalse(summary['passed'])
                self.assertFalse(summary['controlled_eligible'])
                self.assert_all_gates(out, marker)
                record = read_json(out / 'comparison-record.json')
                self.assertEqual(record['budget']['measured_tokens'], 102)
                self.assertEqual(summary['measured_total_tokens'], 102)
                self.assertEqual([row['actor'] for row in record['ledger']['calls']], ['primary', 'reviewer'])
                self.assertEqual(record['ledger']['calls'][-1]['status'], reply['status'])
                self.assertEqual(len(reviewer.requests), 1)
                self.assertFalse(read_json(out / 'run/controlled-review.json')['passed'])

    def test_changed_source_invalidates_a_successful_review_even_after_new_passing_final_gates(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo, out, marker = fixture(Path(tmp))
            run_primary(out)
            reviewer = RecordedAdapter([clean_review()])
            with patch('controlled_workflow.ReviewAdapter', return_value=reviewer):
                self.assertTrue(finish(out)['controlled_eligible'])
            old_review = read_json(out / 'run/controlled-review.json')
            source = repo / 'apps/api/course.test.ts'
            source.write_text(source.read_text() + '// changed after review\n')
            with patch('run_task_a.check') as commands, \
                    patch('controlled_workflow.ReviewAdapter') as adapter:
                refreshed = record_result(out)
            commands.assert_not_called()
            adapter.assert_not_called()
            self.assertFalse(refreshed['controlled_eligible'])
            self.assertIn('Fresh review is missing, stale or has unresolved findings.', refreshed['eligibility_reasons'])
            self.assert_all_gates(out, marker)
            with self.assertRaisesRegex(ValueError, 'different or rejected source'):
                review(out)
            with patch('controlled_workflow.ReviewAdapter') as adapter:
                summary = finish(out)
            adapter.assert_not_called()
            self.assertTrue(summary['validation_passed'])
            self.assertFalse(summary['controlled_eligible'])
            self.assertEqual(read_json(out / 'run/controlled-review.json'), old_review)
            self.assertEqual(read_json(out / 'comparison-record.json')['budget']['measured_tokens'], 92)
            self.assert_all_gates(out, marker, runs=2)

    def test_accounting_refresh_imports_review_without_running_gates_or_models(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, out, marker = fixture(Path(tmp))
            run_primary(out)
            reviewer = RecordedAdapter([clean_review()])
            with patch('controlled_workflow.ReviewAdapter', return_value=reviewer):
                self.assertTrue(finish(out)['controlled_eligible'])
            before_marker = marker.read_bytes()
            before_result = (out / 'run/result.json').read_bytes()
            before_ledger = read_json(out / 'run/provider-usage.json')
            with patch('run_task_a.check') as commands, \
                    patch('coding_task.command') as gates, \
                    patch('controlled_workflow.ReviewAdapter') as adapter:
                refreshed = record_result(out)
            commands.assert_not_called()
            gates.assert_not_called()
            adapter.assert_not_called()
            self.assertTrue(refreshed['controlled_eligible'])
            self.assertTrue(refreshed['usage_complete'])
            self.assertEqual(refreshed['measured_total_tokens'], 92)
            self.assertEqual(marker.read_bytes(), before_marker)
            self.assertEqual((out / 'run/result.json').read_bytes(), before_result)
            self.assertEqual(read_json(out / 'reported-provider-usage.json'), before_ledger)
            self.assert_all_gates(out, marker)


if __name__ == '__main__':
    unittest.main()

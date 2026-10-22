"""Finalization ordering and rollback with a real shared ledger, no model work."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from controlled_workflow import shared_budget
from evidence_report import report
from run_task_a import record_result
from test_report_consistency import fixture


def read(path):
    return json.loads(path.read_text())


def setup(root):
    repo, evidence = fixture(root, True)
    task = read(evidence / 'run/task.json')
    task['execution_environment'] = {'passed': True}
    task['settings'].update(token_budget=1000, max_calls=6)
    (evidence / 'run/task.json').write_text(json.dumps(task))
    trial = read(evidence / 'trial.json')
    trial.update(execution='version_adapter', label='fixture', repetition=1, acceptance_sha256='oracle',
                 tool_versions={'python': 'fixture'}, settings=task['settings'], cache_policy='cold')
    (evidence / 'trial.json').write_text(json.dumps(trial))
    result = read(evidence / 'run/result.json')
    result.update(prompt_sha256='prompt', spec_sha256='spec', base_commit='base', usage={'status': 'unavailable'})
    (evidence / 'run/result.json').write_text(json.dumps(result))
    (evidence / 'run/validation-001').mkdir()
    (evidence / 'run/validation-001/result.json').write_text(json.dumps(result))
    (evidence / 'run/report.md').write_text('Validation\nUsage: unavailable. Total tokens: None.\n')
    budget = shared_budget(evidence / 'run', task['settings'])
    for actor in ('primary', 'reviewer'):
        reservation = budget.reserve(actor, 10, 2, 'generation')
        budget.settle(reservation, {'input_tokens': 10, 'output_tokens': 2,
                      'cached_tokens': 0, 'reasoning_output_tokens': 0}, model='fixture-model')
        budget.close_actor(actor)
    return repo, evidence, task, budget


def execution(evidence, result, meta):
    from run_budget import SharedBudget
    budget = SharedBudget(evidence / 'run/shared-budget.json').snapshot()
    return {'controlled_eligible': budget['complete'], 'budget': budget,
            'eligibility_reasons': [] if budget['complete'] else ['Reporting pending.']}


class ReportingFinalizationTests(unittest.TestCase):
    def test_reports_render_before_close_and_all_usage_views_agree(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, evidence, task, budget = setup(Path(tmp).resolve())
            observed = []
            def render(*args):
                observed.append(budget.snapshot()['actors']['reporting']['closed'])
                return report(*args)
            with patch('coding_task.load', return_value=({}, task)), patch('controlled_workflow.execution_evidence', side_effect=execution), patch('run_task_a.report', side_effect=render):
                result = record_result(evidence)
            self.assertEqual(observed, [False, True])
            self.assertTrue(result['passed']); self.assertTrue(budget.snapshot()['complete'])
            ledger = read(evidence / 'run/provider-usage.json')
            for name in ('run/result.json', 'run/validation-001/result.json'):
                self.assertEqual(read(evidence / name)['usage']['calls'], ledger['calls'])
                self.assertEqual(read(evidence / name)['usage']['total_tokens'], 24)
            self.assertEqual(read(evidence / 'comparison-record.json')['ledger'], ledger)
            self.assertEqual(read(evidence / 'usage.json')['measured_usage']['total_tokens'], 24)
            self.assertIn('Total tokens: 24.', (evidence / 'run/report.md').read_text())

    def test_first_and_final_render_failure_reopen_actor_and_remove_receipts(self):
        for failure_at in (1, 2):
            with self.subTest(failure_at=failure_at), tempfile.TemporaryDirectory() as tmp:
                _, evidence, task, budget = setup(Path(tmp).resolve())
                calls = []
                def fail(*args):
                    calls.append(1)
                    if len(calls) == failure_at:
                        raise OSError('render failed')
                    return report(*args)
                with patch('coding_task.load', return_value=({}, task)), patch('controlled_workflow.execution_evidence', side_effect=execution), patch('run_task_a.report', side_effect=fail):
                    with self.assertRaisesRegex(OSError, 'render failed'):
                        record_result(evidence)
                self.assertFalse(budget.snapshot()['complete'])
                self.assertFalse(budget.snapshot()['actors']['reporting']['closed'])
                self.assertFalse(read(evidence / 'run/provider-usage.json')['complete'])
                self.assertEqual(read(evidence / 'run/result.json')['usage']['status'], 'incomplete')
                for name in ('comparison-record.json', 'report-snapshot.json', 'evaluation-run-record.md', 'usage.json'):
                    self.assertFalse((evidence / name).exists(), name)

    def test_export_cli_copies_report_to_explicit_external_destination(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve(); _, evidence = fixture(root, True); report(evidence)
            destination = root / 'root-evaluation.md'
            completed = subprocess.run([sys.executable, '-B', str(Path(__file__).with_name('run_task_a.py')),
                'export-report', '--evidence', str(evidence), '--destination', str(destination)], capture_output=True, text=True)
            self.assertEqual(completed.returncode, 0, completed.stderr)
            self.assertEqual(destination.read_bytes(), (evidence / 'evaluation-run-record.md').read_bytes())


if __name__ == '__main__':
    unittest.main()

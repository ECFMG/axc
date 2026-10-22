import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch
import coding_benchmark


class PreparationFailureTests(unittest.TestCase):
    def test_install_failure_is_an_immutable_failed_trial_before_any_generation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            harness = root / 'harness'
            harness.mkdir()
            (harness / 'coding-task-set-a.json').write_text(json.dumps({'id': 'fixture', 'settings': {'model': 'fixture-model'}}))
            work = root / 'work'
            (work / 'baseline-1').mkdir(parents=True)
            def git(repo, *args):
                return '' if args == ('status', '--porcelain') else 'a' * 40
            with patch.object(coding_benchmark, '__file__', str(harness / 'coding_benchmark.py')), \
                 patch('coding_benchmark.coding_task.git', side_effect=git), \
                 patch('coding_benchmark.OllamaAdapter') as model, \
                 patch('coding_benchmark.coding_task.command', return_value={'exit_code': 1}), \
                 patch('coding_benchmark.subprocess.run') as execute:
                model.return_value.identity.return_value = 'fixture-model'
                report = coding_benchmark.benchmark(root, 'HEAD', work, root / 'out', root / 'store')
            row = json.loads((root / 'out/baseline-1-comparison.json').read_text())
            self.assertFalse(row['quality_passed'])
            self.assertFalse(row['model_invoked'])
            self.assertEqual(row['status'], 'preparation_failed')
            self.assertTrue(report['stopped_before_generation'])
            self.assertFalse(report['token_savings_claim_supported'])
            execute.assert_not_called()


class PaidFailureTests(unittest.TestCase):
    def test_missing_final_report_retains_durable_paid_calls_and_pending_usage(self):
        from run_budget import SharedBudget
        with tempfile.TemporaryDirectory() as directory:
            evidence = Path(directory)
            budget = SharedBudget(evidence / 'run/shared-budget.json', 1000, 5)
            budget.register_actor('primary')
            reservation = budget.reserve('primary', 50, 20, 'paid failed response')
            budget.settle(reservation, {'input_tokens': 40, 'output_tokens': 10}, status='failed', latency_ms=15)
            budget.reserve('primary', 50, 20, 'in flight')
            row = coding_benchmark.failed_trial(evidence, 'baseline', 1)
            self.assertFalse(row['ledger']['complete'])
            self.assertEqual(row['ledger']['calls'][0]['total_tokens'], 50)
            self.assertEqual(row['ledger']['calls'][0]['latency_ms'], 15)
            self.assertEqual(len(row['unsettled_reservations']), 1)

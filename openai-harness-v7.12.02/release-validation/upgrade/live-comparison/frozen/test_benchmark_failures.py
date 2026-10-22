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

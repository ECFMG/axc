"""Benchmark orchestration contracts without models, dependency installs or Git writes."""
import contextlib
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import coding_benchmark


class ControlledBenchmarkTests(unittest.TestCase):
    def test_frozen_paired_trials_use_controller_and_keep_failed_or_missing_results(self):
        order = [('baseline', 1), ('relevant_context', 1),
                 ('relevant_context', 2), ('baseline', 2),
                 ('baseline', 3), ('relevant_context', 3),
                 ('relevant_context', 4), ('baseline', 4)]
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            harness, work, out = [root / name for name in ('harness', 'work', 'out')]
            harness.mkdir()
            sources = {'coding_benchmark.py': '# fixture driver\n',
                       'run_task_a.py': '# frozen controller\n',
                       'verify.mjs': '// frozen verifier\n', 'requirements.md': '# Fixed task\n',
                       'coding-task-set-a.json': json.dumps({
                           'id': 'fixture-task', 'settings': {'model': 'fixture-model'}})}
            for name, content in sources.items():
                (harness / name).write_text(content)
            (harness / 'ignored.txt').write_text('not part of the frozen harness')
            for variant, repetition in order:
                (work / f'{variant}-{repetition}').mkdir(parents=True)
            base = 'a' * 40
            dispatched, declarations = [], []

            def git(repo, *args):
                if args in (('rev-parse', '--verify', 'fixture-base^{commit}'),
                            ('rev-parse', 'HEAD')):
                    return base
                if args == ('status', '--porcelain'):
                    return ''
                if args == ('branch', '--show-current'):
                    return 'harness/controlled-' + Path(repo).name
                raise AssertionError(('Unexpected Git request', args))

            def controller(argv, **kwargs):
                self.assertEqual(argv[:3], [coding_benchmark.sys.executable, '-B',
                                           str(out / 'frozen/run_task_a.py')])
                phase = argv[3]
                self.assertIn(phase, ('prepare', 'finish'))
                evidence = Path(argv[argv.index('--evidence') + 1])
                dispatched.append((phase, evidence.name))
                declarations.append((out / 'protocol.json').read_bytes())
                if phase == 'prepare':
                    variant, repetition = evidence.name.rsplit('-', 1)
                    self.assertEqual(argv[argv.index('--context-variant') + 1], variant)
                    self.assertEqual(argv[argv.index('--repetition') + 1], repetition)
                    self.assertEqual(argv[argv.index('--expected-repetitions') + 1], '4')
                    self.assertEqual(argv[argv.index('--base') + 1], base)
                    self.assertEqual(Path(argv[argv.index('--repo') + 1]), work / evidence.name)
                    self.assertEqual(argv[argv.index('--branch') + 1],
                                     'harness/controlled-' + evidence.name)
                    self.assertTrue(kwargs['check'])
                    evidence.mkdir()
                    # Editing the original after declaration must not change the controller used.
                    (harness / 'run_task_a.py').write_text('# later source edit\n')
                    self.assertEqual((out / 'frozen/run_task_a.py').read_text(), sources['run_task_a.py'])
                else:
                    self.assertEqual(argv[3:5], ['finish', '--execute'])
                    variant, repetition = evidence.name.rsplit('-', 1)
                    if evidence.name != 'relevant_context-1':
                        row = {'variant': variant, 'repetition': int(repetition),
                               'conditions': {}, 'quality_passed': evidence.name != 'baseline-1',
                               'validation': {'checks': [{'exit_code': 0}] * 8,
                                              'scope_passed': True, 'spec_unchanged': True,
                                              'branch_unchanged': True},
                               'ledger': {'complete': True, 'calls': [{
                                   'source': 'provider', 'status': 'failed' if evidence.name == 'baseline-1' else 'completed',
                                   'input_tokens': 9 if variant == 'baseline' else 3,
                                   'output_tokens': 4 if variant == 'baseline' else 2}]}}
                        (evidence / 'comparison-record.json').write_text(json.dumps(row))
                    return subprocess.CompletedProcess(argv, 7 if evidence.name.endswith('-1') else 0)
                return subprocess.CompletedProcess(argv, 0)

            with patch.object(coding_benchmark, '__file__', str(harness / 'coding_benchmark.py')), \
                    patch('coding_benchmark.coding_task.git', side_effect=git), \
                    patch('coding_benchmark.coding_task.command', return_value={'exit_code': 0}) as install, \
                    patch('coding_benchmark.OllamaAdapter') as adapter, \
                    patch('coding_benchmark.subprocess.run', side_effect=controller), \
                    contextlib.redirect_stdout(io.StringIO()):
                adapter.return_value.identity.return_value = 'fixture-digest'
                report = coding_benchmark.benchmark(root / 'repo', 'fixture-base', work, out,
                                                    root / 'store', repetitions=4)
            adapter.return_value.identity.assert_called_once_with('fixture-model')
            self.assertEqual(install.call_count, 8)
            for call in install.call_args_list:
                self.assertEqual(call.args[0], ['pnpm', 'install', '--offline', '--frozen-lockfile',
                                                '--ignore-scripts', '--store-dir', str(root / 'store')])
            self.assertEqual(dispatched, [(phase, f'{variant}-{repetition}')
                                         for variant, repetition in order for phase in ('prepare', 'finish')])
            self.assertEqual(len(set(declarations)), 1)
            protocol = json.loads(declarations[0])
            self.assertEqual(protocol['order'], [list(pair) for pair in order])
            self.assertEqual(protocol['expected_repetitions'], 4)
            self.assertEqual(protocol['base_commit'], base)
            self.assertEqual(protocol['model_identity'], 'fixture-digest')
            self.assertEqual(protocol['controller_entrypoint'], 'run_task_a.py finish --execute')
            self.assertEqual(protocol['source_hashes'], {
                name: hashlib.sha256(content.encode()).hexdigest() for name, content in sources.items()})
            failed = json.loads((out / 'baseline-1-comparison.json').read_text())
            self.assertFalse(failed['quality_passed'])
            self.assertEqual(failed['ledger']['calls'][0]['status'], 'failed')
            missing = json.loads((out / 'relevant_context-1-comparison.json').read_text())
            self.assertFalse(missing['quality_passed'])
            self.assertEqual(missing['ledger'], {'complete': False, 'calls': []})
            self.assertIn('did not complete', missing['error'])
            self.assertEqual(missing['run_directory'], str(out / 'relevant_context-1'))
            self.assertEqual(report['expected_repetitions'], 4)
            self.assertEqual(report['variants']['baseline']['runs'], 4)
            self.assertEqual(report['variants']['baseline']['successes'], 3)
            self.assertEqual(report['variants']['baseline']['total_tokens'], 52)
            self.assertEqual(report['variants']['relevant_context']['runs'], 4)
            self.assertEqual(report['variants']['relevant_context']['successes'], 3)
            self.assertIn('Incomplete provider usage', report['blocking_reasons'])
            self.assertFalse(report['token_savings_claim_supported'])
            self.assertEqual(json.loads((out / 'comparison.json').read_text()), report)

    def test_invalid_repetition_declarations_fail_before_external_work(self):
        with patch('coding_benchmark.coding_task.git') as git, \
                patch('coding_benchmark.subprocess.run') as run, \
                patch('coding_benchmark.OllamaAdapter') as adapter:
            for repetitions in (0, 1, -1, True, 2.5, '2'):
                with self.subTest(repetitions=repetitions), self.assertRaisesRegex(ValueError, 'at least two'):
                    coding_benchmark.benchmark('.', 'HEAD', '.', '.', '.', repetitions)
            git.assert_not_called()
            run.assert_not_called()
            adapter.assert_not_called()


if __name__ == '__main__':
    unittest.main()

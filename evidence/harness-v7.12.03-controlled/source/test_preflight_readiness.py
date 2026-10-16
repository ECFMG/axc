"""Deterministic readiness checks; no package installation or external commands."""
import concurrent.futures
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from run_task_a import execute
from workflow_setup import preflight


class PreflightReadinessTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.repo = self.root / 'repo'
        self.repo.mkdir()
        self.manifest = {'packageManager': 'pnpm@10.15.1',
                         'devDependencies': {'typescript': '5.9.2', 'turbo': '2.5.0'}}
        self.write_manifest()
        for dependency in self.manifest['devDependencies']:
            (self.repo / 'node_modules' / dependency).mkdir(parents=True)
        self.names = ['package.json']
        self.runs = 0

    def write_manifest(self):
        (self.repo / 'package.json').write_text(json.dumps(self.manifest))

    def probe(self, overrides=None, bind_error=None):
        outputs = {'node': 'v24.10.0\n', 'pnpm': '10.15.1\n', 'func': '4.3.0\n',
                   'java': 'openjdk version "21"\n', 'typescript': '5.9.2\n',
                   'turbo': '2.5.0\n', 'biome': 'Version: 2.2.0\n', 'tsgo': 'Version 7.0.0\n'}
        outputs.update(overrides or {})
        calls = []

        def run(argv, **kwargs):
            calls.append((argv, kwargs))
            name = (argv[2] if argv[:2] == ['pnpm', 'exec'] else
                    'typescript' if argv[:2] == ['node', '-e'] else argv[0])
            value = outputs[name]
            if isinstance(value, Exception):
                raise value
            if isinstance(value, tuple):
                return subprocess.CompletedProcess(argv, value[0], '', value[1])
            return subprocess.CompletedProcess(argv, 0, '' if name == 'java' else value,
                                               value if name == 'java' else '')

        def tracked(argv, **kwargs):
            self.assertEqual(argv, ['git', '-C', str(self.repo), 'ls-files', '-z'])
            return '\0'.join(self.names) + '\0'

        self.runs += 1
        evidence = self.root / ('evidence-%d' % self.runs)
        record = {'repo': str(self.repo), 'base_commit': 'fixture',
                  'branch': 'fixture', 'destination_branch': 'fixture'}
        with patch('workflow_setup.identity', return_value=record), \
             patch('workflow_setup.subprocess.run', side_effect=run), \
             patch('workflow_setup.subprocess.check_output', side_effect=tracked), \
             patch('workflow_setup.socket.socket') as socket_factory, \
             patch('workflow_setup.concurrent.futures.ThreadPoolExecutor',
                   wraps=concurrent.futures.ThreadPoolExecutor) as executor:
            socket_factory.return_value.__enter__.return_value.bind.side_effect = bind_error
            result = preflight(self.repo, 'fixture', 'fixture', evidence)
            executor.assert_called_once_with(max_workers=5)
            socket_factory.return_value.__enter__.return_value.bind.assert_called_once_with(('127.0.0.1', 0))
            socket_factory.return_value.__enter__.return_value.connect.assert_not_called()
        self.assertEqual(json.loads((evidence / 'preflight.json').read_text()), result)
        return result, calls, evidence

    def test_ready_probes_are_bounded_offline_read_only_and_final_gates_remain_required(self):
        before = {str(p.relative_to(self.repo)): p.read_bytes()
                  for p in self.repo.rglob('*') if p.is_file()}
        environment = dict(os.environ)
        result, calls, evidence = self.probe()
        self.assertTrue(result['passed'])
        self.assertTrue(result['final_validation_required'])
        checks = {row['name']: row for row in result['checks']}
        self.assertEqual(set(checks), {'node', 'pnpm', 'func', 'java', 'typescript',
                                       'turbo', 'biome', 'tsgo', 'installed_dependency_links', 'localhost'})
        self.assertEqual(checks['pnpm']['expected_version'], '10.15.1')
        self.assertEqual(checks['pnpm']['actual_version'], '10.15.1')
        self.assertIn('coherence is not verified', checks['installed_dependency_links']['note'])
        self.assertEqual(len(calls), 8)
        self.assertEqual({tuple(argv) for argv, _ in calls}, {
            ('node', '--version'), ('pnpm', '--version'), ('func', '--version'), ('java', '-version'),
            ('node', '-e', "console.log(require('typescript').version)"),
            ('pnpm', 'exec', 'turbo', '--version'), ('pnpm', 'exec', 'biome', '--version'),
            ('pnpm', 'exec', 'tsgo', '--version')})
        for argv, kwargs in calls:
            self.assertEqual(kwargs['timeout'], 20)
            self.assertEqual(kwargs['cwd'], self.repo)
            self.assertTrue(kwargs['capture_output'])
            self.assertTrue(kwargs['text'])
            self.assertNotIn('shell', kwargs)
            for name, value in {'COREPACK_ENABLE_NETWORK': '0', 'COREPACK_ENABLE_DOWNLOAD_PROMPT': '0',
                                'COREPACK_ENABLE_AUTO_PIN': '0', 'npm_config_offline': 'true',
                                'npm_config_manage_package_manager_versions': 'false',
                                'PNPM_MANAGE_PACKAGE_MANAGER_VERSIONS': 'false'}.items():
                self.assertEqual(kwargs['env'][name], value)
        self.assertEqual(os.environ, environment)
        self.assertEqual(before, {str(p.relative_to(self.repo)): p.read_bytes()
                                  for p in self.repo.rglob('*') if p.is_file()})
        for name in ('node', 'pnpm', 'func', 'java', 'typescript', 'turbo', 'biome', 'tsgo'):
            self.assertTrue((evidence / (name + '.log')).is_file())
        self.assertTrue(all(row.get('remediation') for row in checks.values()))

    def test_exact_pnpm_pin_mismatch_blocks_readiness_even_when_command_succeeds(self):
        result, _, _ = self.probe({'pnpm': '10.15.2\n'})
        self.assertFalse(result['passed'])
        check = next(row for row in result['checks'] if row['name'] == 'pnpm')
        self.assertEqual(check['exit_code'], 0)
        self.assertFalse(check['passed'])
        self.assertEqual(check['actual_version'], '10.15.2')
        self.assertIn('pnpm 10.15.1', check['remediation'])

    def test_only_exact_pnpm_pins_require_version_equality(self):
        for manager in (None, 'npm@10.15.1', 'pnpm@>=10', 'pnpm@10.15.1-beta.1'):
            with self.subTest(packageManager=manager):
                self.manifest['packageManager'] = manager
                self.write_manifest()
                result, _, _ = self.probe({'pnpm': '10.16.0\n'})
                self.assertTrue(result['passed'])
                check = next(row for row in result['checks'] if row['name'] == 'pnpm')
                self.assertIsNone(check['expected_version'])
                self.assertEqual(check['actual_version'], '10.16.0')
        (self.repo / 'package.json').unlink()
        self.names = []
        self.assertTrue(self.probe()[0]['passed'])

    def test_each_missing_failing_or_timed_out_prerequisite_blocks_readiness(self):
        failures = {'node': 'v23.0.0\n', 'pnpm': FileNotFoundError('missing pnpm'),
                    'func': (1, 'missing func'), 'java': FileNotFoundError('missing java'),
                    'typescript': (1, 'Cannot find module typescript'),
                    'turbo': FileNotFoundError('missing turbo'), 'biome': (1, 'broken biome binary'),
                    'tsgo': subprocess.TimeoutExpired(['pnpm', 'exec', 'tsgo', '--version'], 20)}
        for name, failure in failures.items():
            with self.subTest(prerequisite=name):
                result, _, evidence = self.probe({name: failure})
                self.assertFalse(result['passed'])
                failed = [row for row in result['checks'] if not row['passed']]
                self.assertEqual([row['name'] for row in failed], [name])
                self.assertTrue(failed[0]['remediation'])
                self.assertTrue((evidence / failed[0]['log']).read_text())

    def test_missing_dependency_link_and_localhost_denial_are_actionable_failures(self):
        self.manifest['dependencies'] = {'uninstalled-runtime': '1.0.0'}
        self.write_manifest()
        result, _, _ = self.probe(bind_error=PermissionError('localhost unavailable'))
        failed = {row['name']: row for row in result['checks'] if not row['passed']}
        self.assertEqual(set(failed), {'installed_dependency_links', 'localhost'})
        self.assertEqual(failed['installed_dependency_links']['missing'], ['package.json: uninstalled-runtime'])
        self.assertIn('--offline --frozen-lockfile --ignore-scripts', failed['installed_dependency_links']['remediation'])
        self.assertIn('do not skip HTTP checks', failed['localhost']['remediation'])

    def test_failed_preflight_blocks_adapter_execution_before_any_command(self):
        result, _, _ = self.probe({'turbo': (1, 'missing turbo')})
        trial = self.root / 'trial'
        trial.mkdir()
        (trial / 'trial.json').write_text(json.dumps({'environment_ready': result['passed']}))
        with patch('run_task_a.subprocess.run') as run:
            with self.assertRaisesRegex(ValueError, 'environment preflight did not pass'):
                execute(trial)
            run.assert_not_called()


if __name__ == '__main__':
    unittest.main()

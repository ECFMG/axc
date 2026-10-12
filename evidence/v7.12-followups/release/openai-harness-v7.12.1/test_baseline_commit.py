"""Real Git regressions for committing measured baselines, not Task A proof."""
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

import coding_task as runner
from coding_agent import write_actions, run_validators
from coding_plan import implementation_ready
import test_coding_task as fixtures


class BaselineCommitTests(unittest.TestCase):
    setUp = fixtures.CodingTaskTests.setUp
    begin = fixtures.CodingTaskTests.begin

    def change(self):
        (self.repo / 'apps/api/new.txt').write_text('measured bytes\n')

    def test_passing_commit_bypasses_mutating_hook_and_records_identity(self):
        state = self.begin(); self.change()
        hooks = self.root / 'hooks'; hooks.mkdir()
        hook = hooks / 'pre-commit'
        hook.write_text('#!/bin/sh\nprintf altered > apps/api/new.txt\nexit 1\n')
        hook.chmod(0o755)
        runner.git(self.repo, 'config', 'core.hooksPath', str(hooks))
        checked = runner.check(self.out)
        saved = runner.commit(self.out)
        self.assertTrue(checked['passed'])
        self.assertEqual(saved['baseline_status'], 'passed')
        self.assertEqual(saved['base_commit'], state['base_commit'])
        self.assertNotEqual(saved['commit'], state['base_commit'])
        self.assertEqual(runner.git(self.repo, 'show', 'HEAD:apps/api/new.txt'), 'measured bytes\n')
        self.assertEqual(runner.git(self.repo, 'status', '--porcelain'), '')
        self.assertFalse(saved['pushed'])
        with self.assertRaisesRegex(ValueError, 'already has a commit'):
            runner.commit(self.out)

    def test_failed_baseline_requires_flag_and_stays_failed(self):
        self.task['checks'].append([sys.executable, '-c', 'raise SystemExit(3)'])
        state = self.begin(); self.change(); runner.check(self.out)
        with self.assertRaisesRegex(ValueError, 'Validation failed'):
            runner.commit(self.out)
        self.assertEqual(runner.git(self.repo, 'rev-parse', 'HEAD').strip(), state['base_commit'])
        saved = runner.commit(self.out, preserve_failed_baseline=True)
        self.assertEqual(saved['baseline_status'], 'failed')
        self.assertFalse(saved['validation_passed'])
        self.assertFalse(json.loads((self.out / 'result.json').read_text())['passed'])
        self.assertIn('failed validation', runner.git(self.repo, 'log', '-1', '--format=%s'))

    def test_all_repository_checks_are_attempted_and_failure_is_recorded(self):
        self.task['commit_checks'] = [[sys.executable, '-c', 'raise SystemExit(2)'], [sys.executable, '-c', "print('second check executed')"]]
        self.begin(); self.change(); runner.check(self.out)
        saved = runner.commit(self.out, preserve_failed_baseline=True)
        self.assertTrue(saved['validation_passed'])
        self.assertFalse(saved['repository_checks_passed'])
        self.assertEqual([c['exit_code'] for c in saved['repository_checks']], [2, 0])
        self.assertIn('second check executed', (self.out / 'commit-check-01.log').read_text())

    def test_scope_violation_cannot_be_bypassed(self):
        self.begin(); self.change(); (self.repo / 'outside.txt').write_text('forbidden')
        runner.check(self.out)
        with self.assertRaisesRegex(ValueError, 'violations cannot be bypassed'):
            runner.commit(self.out, preserve_failed_baseline=True)

    def test_specification_violation_cannot_be_bypassed(self):
        self.begin(); self.change(); (self.repo / 'spec.md').write_text('changed')
        runner.check(self.out)
        with self.assertRaisesRegex(ValueError, 'violations cannot be bypassed'):
            runner.commit(self.out, preserve_failed_baseline=True)

    def test_changed_tracked_file_requires_revalidation(self):
        self.begin(); self.change(); runner.check(self.out)
        (self.repo / 'apps/api/existing.txt').write_text('late edit')
        with self.assertRaisesRegex(ValueError, 'changed since validation'):
            runner.commit(self.out, preserve_failed_baseline=True)

    def test_changed_untracked_file_requires_revalidation(self):
        self.begin(); self.change(); runner.check(self.out)
        (self.repo / 'apps/api/new.txt').write_text('late edit')
        with self.assertRaisesRegex(ValueError, 'changed since validation'):
            runner.commit(self.out, preserve_failed_baseline=True)

    def test_branch_switch_requires_fresh_trial(self):
        self.begin(); self.change(); runner.check(self.out)
        runner.git(self.repo, 'checkout', '-qb', 'different')
        with self.assertRaisesRegex(ValueError, 'original named branch'):
            runner.commit(self.out, preserve_failed_baseline=True)

    def test_no_commit_without_validation(self):
        self.begin(); self.change()
        with self.assertRaisesRegex(ValueError, 'Run check before commit'):
            runner.commit(self.out, preserve_failed_baseline=True)

    def test_no_empty_baseline_commit(self):
        self.begin(); runner.check(self.out)
        with self.assertRaisesRegex(ValueError, 'no baseline changes'):
            runner.commit(self.out)

    def test_missing_check_results_cannot_be_bypassed(self):
        self.begin(); self.change(); runner.check(self.out)
        p = self.out / 'result.json'; r = json.loads(p.read_text()); r['checks'] = []; runner.write_json(p, r)
        with self.assertRaisesRegex(ValueError, 'Complete validation'):
            runner.commit(self.out, preserve_failed_baseline=True)

    def test_repository_check_mutation_requires_revalidation(self):
        self.task['commit_checks'] = [[sys.executable, '-c', "from pathlib import Path; Path('apps/api/new.txt').write_text('mutated')"]]
        self.begin(); self.change(); runner.check(self.out)
        with self.assertRaisesRegex(ValueError, 'changed source files'):
            runner.commit(self.out, preserve_failed_baseline=True)

    def test_stage_only_audited_paths_including_deleted_files(self):
        self.begin(); self.change(); (self.repo / 'apps/api/existing.txt').unlink(); runner.check(self.out)
        saved = runner.commit(self.out)
        paths = runner.git(self.repo, 'diff-tree', '--no-commit-id', '--name-only', '-r', saved['commit']).splitlines()
        self.assertEqual(set(paths), {'apps/api/existing.txt', 'apps/api/new.txt'})

    def test_git_line_ending_filters_cannot_change_measured_bytes(self):
        self.begin(); self.change()
        runner.git(self.repo, 'config', 'core.autocrlf', 'true')
        (self.repo / 'apps/api/new.txt').write_bytes(b'measured bytes\r\n')
        runner.check(self.out)
        with self.assertRaisesRegex(ValueError, 'Git filters changed validated file bytes'):
            runner.commit(self.out)


class WorkspaceAndReadinessTests(unittest.TestCase):
    def test_reference_layers_and_dependencies_are_planned(self):
        task = json.loads(Path(__file__).with_name('coding-task-set-a.json').read_text())
        paths = [s['path'] for s in task['implementation_steps']]
        self.assertIn('packages/axc/domain/src/course.ts', paths)
        self.assertIn('packages/axc/persistence/src/courses.ts', paths)
        self.assertIn('packages/axc/rest/src/course-query.ts', paths)
        self.assertNotIn('packages/axc/application-services/src/course-fixtures.ts', paths)
        self.assertGreater(task['settings']['max_calls'], len(paths))
        self.assertEqual(task['settings']['token_budget'], 300000)
        self.assertTrue(task['allow_workspace_dependencies'])

    def test_only_additive_existing_workspace_dependencies_are_allowed(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp).resolve(); dest = repo / 'apps/api/package.json'; dest.parent.mkdir(parents=True)
            original = {'dependencies': {'existing': '1'}, 'scripts': {}}
            dest.write_text(json.dumps(original))
            domain = repo / 'packages/axc/domain/package.json'; domain.parent.mkdir(parents=True)
            domain.write_text(json.dumps({'name': '@axc/domain'}))
            state = {'existing_axc_directories': ['domain']}
            task = {'allowed_paths': ['apps/api/'], 'allow_workspace_dependencies': True}
            good = {'dependencies': {'existing': '1', '@axc/domain': 'workspace:*'}, 'scripts': {}}
            write_actions(repo, [{'path': 'apps/api/package.json', 'content': json.dumps(good)}], task, state)
            for deps in ({'existing': '2'}, {'existing': '1', 'external': '2'}, {'existing': '1', '@axc/missing': 'workspace:*'}, {'existing': '1', '@axc/domain': '1'}):
                dest.write_text(json.dumps(original))
                with self.subTest(deps=deps), self.assertRaises(ValueError):
                    write_actions(repo, [{'path': 'apps/api/package.json', 'content': json.dumps({'dependencies': deps, 'scripts': {}})}], task, state)

    def test_partial_wiring_checks_format_without_running_incomplete_build(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / 'evidence'; out.mkdir(); repo = Path(tmp) / 'repo'; repo.mkdir()
            (repo / 'a.ts').write_text('export const a = 1;')
            task = {'implementation_steps': [{'path': 'a.ts', 'stage': 'implementation'}, {'path': 'b.ts', 'stage': 'implementation'}]}
            self.assertFalse(implementation_ready(task, repo, {'a.ts'}))
            def command(argv, cwd, log, timeout):
                Path(log).write_text('format passed')
                return {'argv': argv, 'exit_code': 0}
            with patch('coding_agent.coding_task.command', side_effect=command) as mocked:
                result = run_validators(repo, out, 1, {'a.ts'}, task)
            self.assertEqual(mocked.call_count, 1)
            self.assertEqual(mocked.call_args.args[0][:5], ['pnpm', 'exec', 'biome', 'check', '--write'])
            self.assertFalse(result['passed'])

    def test_complete_wiring_executes_registered_full_test_suite(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / 'evidence'; out.mkdir(); repo = Path(tmp) / 'repo'; repo.mkdir()
            changed = {'a.ts', 'src/a.test.ts', 'apps/docs/courses.md'}
            for name in changed:
                path = repo / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_text('fixture')
            task = {'implementation_steps': [{'path': n, 'stage': 'implementation' if n == 'a.ts' else 'deliverables'} for n in sorted(changed)]}
            def command(argv, cwd, log, timeout):
                Path(log).write_text('controlled check passed')
                return {'argv': argv, 'exit_code': 0}
            with patch('coding_agent.coding_task.command', side_effect=command) as mocked:
                result = run_validators(repo, out, 1, changed, task)
            self.assertEqual(mocked.call_args.args[0], ['pnpm', 'run', 'test', '--env-mode=loose'])
            self.assertTrue(result['passed'])


if __name__ == '__main__':
    unittest.main()

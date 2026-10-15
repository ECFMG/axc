"""Native-host repair and fresh-review contracts; no provider calls."""
import hashlib
import json
from pathlib import Path
import subprocess
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

import coding_task
from coding_workflow import finish, host_context, repair, review_packet
from test_efficiency_release import repository, git


def fixture(root):
    repo = repository(root)
    (repo / 'spec.md').write_text('Fixed specification.')
    git(repo, 'add', '.')
    git(repo, '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'spec')
    marker = root / 'final-gates.txt'
    gate = [sys.executable, '-c', f"from pathlib import Path;p=Path({str(marker)!r});p.write_text((p.read_text() if p.exists() else '')+'x')"]
    task = {'id': 'fixture-not-live-task-a', 'version': 'fixture', 'spec': 'spec.md', 'prompt': 'Fixed task.',
            'allowed_paths': ['apps/api/', 'apps/docs/'], 'settings': {'model': 'fixture'},
            'focused_local_validation': True, 'execution_environment': {'passed': True},
            'checks': [gate] * 8,
            'implementation_steps': [{'path': 'apps/api/course.test.ts', 'instruction': 'test'},
                                     {'path': 'apps/docs/courses.md', 'instruction': 'docs'}]}
    definition = root / 'task.json'; definition.write_text(json.dumps(task))
    out = root / 'evidence'; out.mkdir()
    frozen = out / 'frozen'; frozen.mkdir()
    for source in Path(__file__).resolve().parent.iterdir():
        if source.is_file() and source.suffix in ('.py', '.mjs', '.json', '.md'):
            shutil.copy2(source, frozen / source.name)
    coding_task.begin(repo, definition, out / 'run')
    (out / 'trial.json').write_text(json.dumps({'label': 'fixture', 'execution': 'external_host',
        'environment_ready': True, 'acceptance_sha256': 'fixture', 'tool_versions': {},
        'report_template_sha256': hashlib.sha256((frozen / 'EVALUATION_RUN_RECORD_TEMPLATE.md').read_bytes()).hexdigest(),
        'settings': task['settings'], 'cache_policy': 'fixture', 'source_hashes': {}, 'repetition': 1}))
    for name in ['apps/api/course.test.ts', 'apps/docs/courses.md']:
        target = repo / name; target.parent.mkdir(parents=True, exist_ok=True); target.write_text('fixture')
    return repo, out, marker


def passing(argv, repo, log, timeout):
    log.write_text('passing fixture')
    return {'argv': argv, 'exit_code': 0, 'seconds': 0}


class NativeEfficiency(unittest.TestCase):
    def test_local_repair_cache_and_host_packet_never_establish_final_completion(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo, out, marker = fixture(Path(tmp))
            with patch('coding_agent.coding_task.command', side_effect=passing) as runner:
                first = repair(out)
                second = repair(out)
            self.assertTrue(first['passed_local_checks'])
            self.assertFalse(first['completion_established'])
            self.assertEqual(runner.call_count, 4)  # Format each time; unchanged build/unit reused.
            self.assertTrue(second['commands'][1]['reused'])
            self.assertEqual([r['stage'] for r in first['commands']], ['format', 'build', 'submitted_tests'])
            self.assertFalse(marker.exists())
            self.assertFalse((out / 'run/result.json').exists())
            host_context(out)
            text = (out / 'host-context.txt').read_text()
            self.assertIn('"stage": "local_repair"', text)
            self.assertIn('"completion_established": false', text)
            self.assertIn('"passed": false', text)
            (repo / 'apps/api/course.test.ts').write_text('edited after repair')
            host_context(out)
            self.assertIn('"matches_current_files": false', (out / 'host-context.txt').read_text())

    def test_unready_no_harness_scope_and_branch_block_commands(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); repo, out, marker = fixture(root)
            trial = json.loads((out / 'trial.json').read_text())
            with patch('coding_agent.run_validators') as runner:
                (out / 'trial.json').write_text(json.dumps({**trial, 'environment_ready': False}))
                for action in (repair, host_context):
                    with self.assertRaises(ValueError): action(out)
                (out / 'trial.json').write_text(json.dumps({**trial, 'label': 'no_harness'}))
                with self.assertRaises(ValueError): repair(out)
                (out / 'trial.json').write_text(json.dumps(trial))
                bad = repo / 'outside.txt'; bad.write_text('outside scope')
                with self.assertRaises(ValueError): repair(out)
                bad.unlink(); git(repo, 'checkout', '-qb', 'other')
                with self.assertRaises(ValueError): repair(out)
                runner.assert_not_called()
            self.assertFalse(marker.exists())

    def test_repair_failure_diagnostics_are_retrievable_and_full_finish_always_runs_all_gates(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo, out, marker = fixture(Path(tmp))
            def failing(argv, repo, log, timeout):
                log.write_text('apps/api/course.test.ts: FIXTURE_FAILURE')
                return {'argv': argv, 'exit_code': 1, 'seconds': 0}
            with patch('coding_agent.coding_task.command', side_effect=failing):
                local = repair(out)
            self.assertTrue(local['checks_failed'])
            host_context(out)
            self.assertIn('FIXTURE_FAILURE', (out / 'host-context.txt').read_text())
            self.assertTrue(finish(out)['passed'])
            self.assertEqual(marker.read_text(), 'x' * 8)
            self.assertTrue(finish(out)['passed'])
            self.assertEqual(marker.read_text(), 'x' * 16)

    def test_fresh_handoff_has_complete_requirements_bounded_summary_and_no_claimed_review(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo, out, marker = fixture(Path(tmp))
            finish(out)
            meta = review_packet(out)
            handoff = json.loads((out / 'review-handoff.json').read_text())
            packet = (out / 'review-packet.txt').read_text()
            self.assertEqual(handoff['spawn_agent']['fork_turns'], 'none')
            self.assertNotIn('model', handoff['spawn_agent'])
            self.assertFalse(handoff['reviewer_executed'])
            self.assertEqual(handoff['packet_sha256'], hashlib.sha256(packet.encode()).hexdigest())
            self.assertIn('Fixed specification.', packet)
            self.assertTrue(meta['validation_summary']['passed'])
            self.assertTrue(all('output' not in row for row in meta['validation_summary']['commands']))
            (repo / 'apps/api/course.test.ts').write_text('x' * 30000)
            meta = review_packet(out, 12000)
            handoff = json.loads((out / 'review-handoff.json').read_text())
            self.assertTrue(handoff['requires_omitted_diff_retrieval'])
            self.assertFalse(meta['validation_summary']['passed'])
            self.assertFalse(meta['scope_complete'])

    def test_fixed_task_a_generation_limits_and_all_eight_gates_remain_unchanged(self):
        source = Path(__file__).resolve().parent
        current = json.loads((source / 'coding-task-set-a.json').read_text())
        previous = json.loads((source / 'parent-v7.12.02/coding-task-set-a.json').read_text())
        for key in ['settings', 'checks', 'allowed_paths', 'protected_paths', 'verification_files',
                    'implementation_steps', 'action_batch_size', 'focused_local_validation']:
            self.assertEqual(current[key], previous[key], key)
        self.assertEqual(len(current['checks']), 8)


if __name__ == '__main__':
    unittest.main()

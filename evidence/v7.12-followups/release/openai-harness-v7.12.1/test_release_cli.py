"""Exercise the frozen release CLI with a small real repository and external work.

The fixture replaces acceptance commands before freezing; this is not Task A proof.
"""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


class ReleaseCLI(unittest.TestCase):
    def test_prepare_external_score_recheck_and_reject_adapter(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve(); source = Path(__file__).resolve().parent
            package = root / 'package'; package.mkdir(); repo = root / 'repo'; repo.mkdir(); out = root / 'evidence'
            for p in source.iterdir():
                if p.is_file() and p.suffix in ('.py', '.mjs', '.json', '.md'): shutil.copyfile(p, package / p.name)
            task = json.loads((package / 'coding-task-set-a.json').read_text())
            task['checks'] = [[sys.executable, '-c', "print('controlled CLI fixture check, not Task A')"],
                              [sys.executable, '{verification_dir}/task_a_gates.py', '--repo', '.', '--base', '{base_commit}', '--out', '{validation_dir}/submitted']]
            task['commit_checks'] = [[sys.executable, '-c', "print('controlled repository check, not Task A')"]]
            (package / 'coding-task-set-a.json').write_text(json.dumps(task))
            shutil.copyfile(source / 'task-set-a-requirements.md', repo / 'task-set-a-requirements.md')
            api = repo / 'apps/api'; api.mkdir(parents=True)
            (api / 'package.json').write_text(json.dumps({'scripts': {'test:courses': 'node --test test/courses.test.mjs'}}))
            for args in [['init', '-q'], ['config', 'user.name', 'Fixture'], ['config', 'user.email', 'fixture@example.invalid'], ['add', '.'], ['-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture']]:
                subprocess.run(['git', '-C', str(repo)] + args, check=True, capture_output=True)
            cli = [sys.executable, '-B', str(package / 'run_task_a.py')]
            prepared = subprocess.run(cli + ['prepare', '--repo', str(repo), '--evidence', str(out), '--no-harness'], capture_output=True, text=True)
            self.assertEqual(prepared.returncode, 0, prepared.stderr)
            frozen = json.loads((out / 'run/task.json').read_text())
            self.assertNotIn('agent_command', frozen)
            self.assertEqual((out / 'run/prompt.md').read_bytes(), (source / 'task-set-a-prompt.md').read_bytes())
            forbidden = subprocess.run(cli + ['execute', '--evidence', str(out)], capture_output=True, text=True)
            self.assertEqual(forbidden.returncode, 2)
            test = api / 'test/courses.test.mjs'; test.parent.mkdir()
            test.write_text("import test from 'node:test'; import assert from 'node:assert/strict'; test('fixture',()=>assert.equal(2,2));")
            doc = repo / 'apps/docs/docs/courses.md'; doc.parent.mkdir(parents=True)
            doc.write_text('/api/courses q modality status tag page pageSize sort items totalItems totalPages INVALID_QUERY_PARAMETER details')
            for _ in range(2):
                checked = subprocess.run(cli + ['check', '--evidence', str(out)], capture_output=True, text=True)
                self.assertEqual(checked.returncode, 0, checked.stdout + checked.stderr)
            record = json.loads((out / 'comparison-record.json').read_text())
            self.assertTrue(record['quality_passed'])
            self.assertEqual(record['label'], 'no_harness')
            self.assertFalse(record['ledger']['complete'])
            self.assertTrue((out / 'run/validation-002/submitted/result.json').is_file())
            committed = subprocess.run(cli + ['commit', '--evidence', str(out)], capture_output=True, text=True)
            self.assertEqual(committed.returncode, 0, committed.stdout + committed.stderr)
            self.assertEqual(json.loads((out / 'run/commit.json').read_text())['baseline_status'], 'passed')
            # Frozen supporting controller edits must invalidate evaluation.
            with (out / 'frozen/coding_actions.py').open('a') as stream: stream.write('\n# altered\n')
            rejected = subprocess.run(cli + ['check', '--evidence', str(out)], capture_output=True, text=True)
            self.assertEqual(rejected.returncode, 2)


if __name__ == '__main__': unittest.main()

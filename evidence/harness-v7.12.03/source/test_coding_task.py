import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import coding_task as runner


class CodingTaskTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self.out = self.root / "run"
        subprocess.run(["git", "init", "-q", str(self.repo)], check=True)
        runner.git(self.repo, "config", "user.name", "Harness test")
        runner.git(self.repo, "config", "user.email", "test@example.invalid")
        (self.repo / "spec.md").write_text("Fixed specification")
        (self.repo / "apps/api").mkdir(parents=True)
        (self.repo / "apps/api/existing.txt").write_text("before")
        runner.git(self.repo, "add", ".")
        runner.git(self.repo, "-c", "core.hooksPath=/dev/null", "commit", "-qm", "fixture")
        self.task = {
            "id": "fixture", "prompt": "Write a file", "spec": "spec.md",
            "allowed_paths": ["apps/api/"], "settings": {"model": "test command"},
            "checks": [[sys.executable, "-c", "print('checked')"]],
        }
        self.task_path = self.root / "task.json"

    def begin(self):
        runner.write_json(self.task_path, self.task)
        return runner.begin(self.repo, self.task_path, self.out)

    def test_external_run_captures_files_and_unknown_usage(self):
        self.begin()
        (self.repo / "apps/api/new.txt").write_text("after")
        result = runner.check(self.out)
        self.assertTrue(result["passed"])
        self.assertIsNone(result["usage"]["total_tokens"])
        self.assertEqual((self.out / "validation-001/files/apps/api/new.txt").read_text(), "after")
        runner.check(self.out)
        self.assertTrue((self.out / "validation-002/result.json").is_file())

    def test_command_adapter_receives_frozen_prompt_and_executes(self):
        self.task["agent_command"] = [sys.executable, "-c", "import os,pathlib; pathlib.Path('apps/api/result.txt').write_text(pathlib.Path(os.environ['HARNESS_PROMPT_FILE']).read_text())"]
        self.begin()
        self.assertEqual(runner.execute(self.out)["exit_code"], 0)
        self.assertEqual((self.repo / "apps/api/result.txt").read_text(), self.task["prompt"])
        self.assertTrue(runner.check(self.out)["passed"])
        with self.assertRaises(ValueError):
            runner.execute(self.out)

    def test_branch_drift_blocks_execution_and_final_success(self):
        self.task['agent_command'] = [sys.executable, '-c', "print('must not execute')"]
        self.begin()
        runner.git(self.repo, 'checkout', '-qb', 'different-branch')
        with self.assertRaisesRegex(ValueError, 'branch'):
            runner.execute(self.out)
        self.assertFalse(runner.check(self.out)['passed'])
        self.assertFalse((self.out/'agent.json').exists())

    def test_final_checks_do_not_reuse_local_repair_cache(self):
        self.task['checks'] = [[sys.executable, '-c', "from pathlib import Path; p=Path('apps/api/count'); p.write_text(p.read_text()+'x' if p.exists() else 'x')"]]
        self.begin()
        runner.write_json(self.out/'validator-cache.json', {'build': {'signature': 'anything'}})
        self.assertTrue(runner.check(self.out)['passed'])
        self.assertTrue(runner.check(self.out)['passed'])
        self.assertEqual((self.repo/'apps/api/count').read_text(), 'xx')

    def test_rejects_dirty_start_and_existing_evidence(self):
        self.begin()
        with self.assertRaises(FileExistsError):
            runner.begin(self.repo, self.task_path, self.out)
        (self.repo / "unexpected").write_text("dirty")
        with self.assertRaises(ValueError):
            runner.begin(self.repo, self.task_path, self.root / "other")

    def test_frozen_task_tampering_rejected(self):
        self.begin()
        (self.out / "task.json").write_text("{}")
        with self.assertRaises(ValueError):
            runner.check(self.out)

    def test_exact_prompt_file_and_saved_prompt_tampering(self):
        prompt = self.root / "official.md"
        prompt.write_bytes(b"Official prompt.\r\nKeep bytes intact.\r\n")
        self.task["prompt_file"] = "official.md"
        self.begin()
        self.assertEqual((self.out / "prompt.md").read_bytes(), prompt.read_bytes())
        runner.load(self.out)
        (self.out / "prompt.md").write_text("Altered prompt")
        with self.assertRaisesRegex(ValueError, "prompt changed"):
            runner.load(self.out)

    def test_independent_verification_is_frozen(self):
        (self.root / "oracle.py").write_text("print('fixed check')")
        self.task["verification_files"] = ["oracle.py"]
        self.task["checks"] = [[sys.executable, "{verification_dir}/oracle.py"]]
        self.begin()
        self.assertTrue(runner.check(self.out)["passed"])
        (self.out / "verification/oracle.py").write_text("print('weakened check')")
        with self.assertRaisesRegex(ValueError, "verification changed"):
            runner.check(self.out)

    def test_unknown_cache_counter_stays_unknown(self):
        path = self.root / "usage.json"
        runner.write_json(path, {"complete": True, "calls": [{"source": "provider", "model": "local", "input_tokens": 10, "output_tokens": 4, "cached_tokens": None}]})
        result = runner.usage(path)
        self.assertIsNone(result["cached_tokens"])
        self.assertEqual(result["total_tokens"], 14)

    def test_scope_violation_skips_validation(self):
        self.begin()
        (self.repo / "outside.txt").write_text("forbidden")
        result = runner.check(self.out)
        self.assertFalse(result["passed"])
        self.assertEqual(result["checks"], [])
        self.assertIn("outside.txt", result["scope"]["violations"])

    def test_protected_file_and_symlink_rejected(self):
        self.begin()
        (self.repo / "apps/api/.env").write_text("fixture")
        (self.repo / "apps/api/link").symlink_to(self.repo / "spec.md")
        result = runner.check(self.out)
        self.assertFalse(result["passed"])
        self.assertEqual(len(result["scope"]["violations"]), 2)

    def test_rename_and_committed_changes_remain_visible(self):
        self.begin()
        (self.repo / "apps/api/existing.txt").rename(self.repo / "outside.txt")
        runner.git(self.repo, "add", ".")
        runner.git(self.repo, "-c", "core.hooksPath=/dev/null", "commit", "-qm", "move")
        result = runner.check(self.out)
        self.assertIn("outside.txt", result["scope"]["violations"])
        self.assertIn("apps/api/existing.txt", result["scope"]["changed_paths"])

    def test_failed_agent_cannot_pass_good_checks(self):
        self.task["agent_command"] = [sys.executable, "-c", "raise SystemExit(9)"]
        self.begin()
        runner.execute(self.out)
        self.assertFalse(runner.check(self.out)["passed"])

    def test_failed_check_fails_run(self):
        self.task["checks"].append([sys.executable, "-c", "raise SystemExit(3)"])
        self.begin()
        self.assertFalse(runner.check(self.out)["passed"])

    def test_timeout_kills_command(self):
        result = runner.command([sys.executable, "-c", "import time; time.sleep(30)"], self.repo, self.root / "timeout.log", 0.03)
        self.assertTrue(result["timeout"])
        self.assertNotEqual(result["exit_code"], 0)

    def test_usage_counts_cache_once_and_requires_complete_ledger(self):
        path = self.root / "usage.json"
        data = {"complete": True, "calls": [{"source": "provider", "model": "fixture", "input_tokens": 100, "output_tokens": 20, "cached_tokens": 50, "estimated_cost_usd": 0.01}]}
        runner.write_json(path, data)
        self.assertEqual(runner.usage(path)["total_tokens"], 120)
        self.assertEqual(runner.usage(path)["estimated_cost_usd"], 0.01)
        data["calls"][0]["cached_tokens"] = 101
        runner.write_json(path, data)
        with self.assertRaises(ValueError):
            runner.usage(path)
        data["complete"] = False
        runner.write_json(path, data)
        with self.assertRaises(ValueError):
            runner.usage(path)


if __name__ == "__main__":
    unittest.main()

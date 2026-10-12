"""Frozen pre-refactor behavior across every strategy combination and both CLIs."""

import hashlib
import io
import itertools
import json
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from types import SimpleNamespace

import harness
import workflow
from model_adapters import MockAdapter

ROOT = Path(__file__).resolve().parent


def stable(value):
    """Remove clocks only; retain prompts, usage, errors, order, and quality."""
    if isinstance(value, dict):
        return {key: stable(item) for key, item in value.items() if not key.endswith('latency_ms')}
    if isinstance(value, list):
        return [stable(item) for item in value]
    return value


def fingerprint(value):
    text = json.dumps(stable(value), sort_keys=True, ensure_ascii=False, separators=(',', ':'))
    return hashlib.sha256(text.encode()).hexdigest()


def capture():
    config = json.loads((ROOT / 'workflow-config.json').read_text())
    tasks = [task for name in ('tasks-tune.json', 'tasks-eval.json')
             for task in json.loads((ROOT / name).read_text())['tasks']]
    workflows = {}
    # Frozen legacy surface; new opt-in strategies have their own behavior tests.
    legacy_strategies = ('deduplicate', 'retrieve', 'tool_limit', 'compact_history', 'budgets')
    for count in range(len(legacy_strategies) + 1):
        for strategies in itertools.combinations(legacy_strategies, count):
            for task in tasks:
                adapter = MockAdapter()
                for trial in range(2):
                    result = workflow.execute(task, config, list(strategies), adapter, 'compatibility')
                    identity = '/'.join([','.join(strategies) or 'baseline', task['id'], str(trial)])
                    workflows[identity] = fingerprint(result)
    teaching = {}
    with tempfile.TemporaryDirectory() as temp, redirect_stderr(io.StringIO()):
        for name in ('example.json', 'teaching.json'):
            suite = harness.validate(json.loads((ROOT / name).read_text()))
            for mode in ('total', 'output'):
                args = SimpleNamespace(demo=True, model='synthetic-demo', repeat=2, min_pass_rate=1.0, objective='tokens',
                                       min_savings=0.1, token_budget=80000, plan=False, optimize=mode,
                                       out=Path(temp) / 'report.json')
                teaching[name + '/' + mode] = fingerprint(harness.run(suite, args, harness.demo_provider(suite)))
    return dict(workflows=workflows, teaching=teaching)


class CompatibilityChecks(unittest.TestCase):
    def test_pre_refactor_behavior_is_preserved(self):
        expected = json.loads((ROOT / 'compatibility.json').read_text())
        self.assertEqual(capture(), expected)


if __name__ == '__main__':
    unittest.main()

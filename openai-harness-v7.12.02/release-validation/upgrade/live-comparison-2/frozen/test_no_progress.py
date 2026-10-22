import test_coding_agent
from coding_context import NoProgressGuard, NoProgressError
import json
import unittest


class ProgressTests(unittest.TestCase):
    def test_unchanged_evidence_blocks_repeats_even_with_other_reads_between(self):
        guard = NoProgressGuard(3)
        guard.observe('read', 'old')
        guard.observe('other read', 'old')
        guard.observe('read', 'old')
        with self.assertRaises(NoProgressError):
            guard.observe('read', 'old')
        guard.observe('write', 'new', changed=True)
        guard.observe('read', 'old')
        guard.observe('read', 'new')


class AgentProgressTests(test_coding_agent.CodingAgentBudgets):
    def test_noop_loop_stops_before_generation_limit_and_retains_usage(self):
        self.task['settings']['max_calls'] = 10
        self.adapter.generate.return_value['text'] = json.dumps({'path': '', 'content': '', 'edits': [], 'read_files': [], 'validate': True})
        with unittest.mock.patch('coding_agent.run_validators', return_value={'passed': False, 'commands': []}) as validate:
            result = self.execute()
        self.assertEqual(validate.call_count, 2)
        self.assertEqual(self.adapter.generate.call_count, 3)
        self.assertIn('without source progress', result['reason'])
        ledger = json.loads((self.out / 'provider-usage.json').read_text())
        self.assertEqual(sum(c['total_tokens'] for c in ledger['calls']), 42)

import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from coding_agent import run, safe_path, write_actions


class CodingAgentGuards(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name).resolve()
        (self.repo / 'apps/api').mkdir(parents=True)
        (self.repo / 'apps/api/package.json').write_text('{"dependencies":{"existing":"1"},"scripts":{}}')
        self.task = {'allowed_paths': ['apps/api/', 'packages/axc/'], 'protected_paths': ['apps/api/protected.ts']}
        self.state = {'existing_axc_directories': ['rest']}

    def test_whole_batch_rejects_before_any_write(self):
        actions = [{'path': 'apps/api/new.ts', 'content': 'ok'}, {'path': '../escape', 'content': 'bad'}]
        with self.assertRaises(ValueError):
            write_actions(self.repo, actions, self.task, self.state)
        self.assertFalse((self.repo / 'apps/api/new.ts').exists())

    def test_protected_paths_and_new_packages_rejected(self):
        for name in ['apps/api/.env', 'apps/api/host.json', 'apps/api/protected.ts', 'packages/axc/new/src/index.ts', 'package.json']:
            with self.subTest(name=name), self.assertRaises(ValueError):
                write_actions(self.repo, [{'path': name, 'content': ''}], self.task, self.state)

    def test_symlink_write_rejected(self):
        (self.repo / 'apps/api/link').symlink_to(self.repo / 'apps/api/package.json')
        with self.assertRaises(ValueError):
            safe_path(self.repo, 'apps/api/link')

    def test_dependencies_preserved_but_test_script_allowed(self):
        new = {'dependencies': {'existing': '1'}, 'scripts': {'test': 'node --test'}}
        write_actions(self.repo, [{'path': 'apps/api/package.json', 'content': json.dumps(new)}], self.task, self.state)
        new['dependencies']['added'] = '2'
        with self.assertRaises(ValueError):
            write_actions(self.repo, [{'path': 'apps/api/package.json', 'content': json.dumps(new)}], self.task, self.state)

    def test_safe_file_is_written(self):
        changed = write_actions(self.repo, [{'path': 'apps/api/src/course.ts', 'content': 'export type Course = {};'}], self.task, self.state)
        self.assertEqual(changed, {'apps/api/src/course.ts'})
        self.assertTrue((self.repo / 'apps/api/src/course.ts').is_file())


class CodingAgentBudgets(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.repo = self.root / 'repo'
        self.repo.mkdir()
        self.out = self.root / 'evidence'
        self.out.mkdir()
        (self.out / 'spec.md').write_text('Keep required specification intact.')
        self.task = {'prompt': 'Exact user prompt.\nPreserve every constraint.',
                     'allowed_paths': ['apps/api/'], 'settings': {
                         'model': 'test-only', 'context_tokens': 1000,
                         'timeout_seconds': 1, 'temperature': 0,
                         'max_output_tokens': 20, 'max_calls': 2, 'token_budget': 1000}}
        self.state = {'repo': str(self.repo), 'existing_axc_directories': []}
        self.adapter = unittest.mock.Mock()
        self.adapter.count.return_value = {'tokens': 100}
        self.adapter.reset_cache.return_value = {'verified_unloaded': True}
        self.adapter.generate.return_value = {
            'usage': {'input_tokens': 10, 'output_tokens': 4, 'total_tokens': 14, 'cached_tokens': 0},
            'model': 'test-only', 'status': 'completed', 'provider_duration_ns': {},
            'text': '{"path":"","content":"","edits":[],"read_files":[],"validate":false}',
        }

    def execute(self):
        with patch('coding_agent.coding_task.load', return_value=(self.state, self.task)), \
             patch('coding_agent.source_paths', return_value=[]), \
             patch('coding_agent.JsonAdapter', return_value=self.adapter):
            return run(self.out, 'baseline')

    def test_context_reservation_stops_before_generation(self):
        self.adapter.count.return_value = {'tokens': 990}
        result = self.execute()
        self.adapter.generate.assert_not_called()
        self.assertFalse(result['passed_local_checks'])
        self.assertIn('context budget', result['reason'])

    def test_total_budget_reserves_the_complete_next_response(self):
        self.task['settings']['token_budget'] = 119
        result = self.execute()
        self.adapter.generate.assert_not_called()
        self.assertIn('token budget', result['reason'])

    def test_failed_attempts_count_and_call_limit_is_enforced(self):
        result = self.execute()
        self.assertEqual(self.adapter.generate.call_count, 2)
        self.assertEqual(result['calls'], 2)
        self.assertFalse(result['passed_local_checks'])
        ledger = json.loads((self.out / 'provider-usage.json').read_text())
        self.assertTrue(ledger['complete'])
        self.assertEqual(sum(c['input_tokens'] + c['output_tokens'] for c in ledger['calls']), 28)
        self.assertEqual(ledger['calls'][1]['purpose'], 'repair_or_retrieval')

    def test_exact_prompt_and_spec_survive_every_repair_request(self):
        self.execute()
        for call in self.adapter.generate.call_args_list:
            request = call.args[0]
            self.assertEqual(request['input'][0]['content'], self.task['prompt'])
            self.assertEqual(request['input'][1]['content'], 'Referenced task specification:\nKeep required specification intact.')


if __name__ == '__main__':
    unittest.main()

import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch
from coding_context import choose_sources, request_context, read_log
from coding_agent import run


class ContextTests(unittest.TestCase):
    def test_retrieval_is_step_specific_and_explicit_reads_survive(self):
        task = {'context_groups': {'a.ts': ['dependency.ts']}}
        chosen = choose_sources(task, 'relevant_context', ['a.ts', 'dependency.ts', 'other.ts'], {'old.ts'}, {'other.ts'}, {'target': 'a.ts'})
        self.assertEqual(chosen, {'a.ts', 'dependency.ts', 'other.ts'})
        self.assertNotIn('old.ts', chosen)

    def test_unknown_target_keeps_inventory_retrievable_without_loading_every_file(self):
        self.assertEqual(choose_sources({'context_groups': {}}, 'relevant_context', ['a.ts'], {'new.ts'}, set(), {'target': 'unknown'}), set())

    def test_readable_source_and_passing_logs_omitted(self):
        payload = {'current_files': {'a.ts': 'line1\nline2'}, 'validation_feedback': {'commands': [{'exit_code': 0, 'output': 'noisy passed log'}, {'exit_code': 1, 'output': 'bad\nbad\n', 'stage': 'build'}]}, 'requested_logs': {}, 'implementation_progress': {}}
        rendered = request_context(payload)
        self.assertIn('line1\nline2', rendered)
        self.assertNotIn('noisy passed log', rendered)
        self.assertEqual(rendered.count('bad'), 1)

    def test_paged_log_is_recoverable_past_legacy_cutoff(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp); (out / 'repair-01').mkdir(); (out / 'repair-01/00.log').write_text('x' * 60000 + 'tail')
            self.assertIn('tail', read_log(out, '@log/repair-01/00.log:60000:100'))
            with self.assertRaises(ValueError): read_log(out, '@log/../secret.log:0:100')

    def test_read_and_truncation_preserve_unresolved_failures(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve(); repo = root / 'repo'; repo.mkdir(); out = root / 'out'; out.mkdir()
            (repo / 'apps/api').mkdir(parents=True); (out / 'spec.md').write_text('fixed spec')
            task = {'prompt': 'fixed prompt', 'allowed_paths': ['apps/api/'], 'settings': {'model': 'fixture', 'context_tokens': 100000, 'timeout_seconds': 1, 'temperature': 0, 'max_output_tokens': 100, 'max_calls': 4, 'token_budget': 100000}}
            state = {'repo': str(repo), 'existing_axc_directories': []}
            def response(text, status='completed'):
                return {'usage': {'input_tokens': 20, 'output_tokens': 30, 'total_tokens': 50, 'cached_tokens': 0}, 'model': 'fixture', 'status': status, 'provider_duration_ns': {}, 'text': text}
            def action(**updates):
                a = {'path': '', 'content': '', 'edits': [], 'read_files': [], 'validate': False}; a.update(updates); return json.dumps(a)
            adapter = Mock(); adapter.count.return_value = {'tokens': 20}; adapter.reset_cache.return_value = {'verified_unloaded': True}
            adapter.generate.side_effect = [response(action(path='apps/api/a.ts', content='export const a = 1;')), response(action(read_files=['apps/api/a.ts'])), response('', 'incomplete'), response(action(validate=True))]
            feedback = {'passed': False, 'commands': [{'stage': 'build', 'exit_code': 1, 'output': 'bad type', 'log': 'repair-01/00.log'}]}
            with patch('coding_agent.coding_task.load', return_value=(state, task)), patch('coding_agent.source_paths', return_value=[]), patch('coding_agent.JsonAdapter', return_value=adapter), patch('coding_agent.run_validators', return_value=feedback):
                run(out, 'relevant_context')
            for call in adapter.generate.call_args_list[1:]:
                self.assertIn('bad type', call.args[0]['input'][2]['content'])
            self.assertEqual(sum(c['total_tokens'] for c in json.loads((out / 'provider-usage.json').read_text())['calls']), 200)

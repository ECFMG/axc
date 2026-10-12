import copy
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import Mock, patch

from coding_actions import decode_action
from coding_agent import safe_path, run
from compare_versions import compare
from task_a_gates import evaluate, parse_evidence, documentation


def action(**changes):
    value = {'path': '', 'content': '', 'edits': [], 'read_files': [], 'validate': False}
    value.update(changes)
    return json.dumps(value)


class ActionTests(unittest.TestCase):
    def test_native_schema_has_flat_complete_required_fields(self):
        from coding_actions import SCHEMA
        self.assertNotIn('anyOf', SCHEMA)
        self.assertEqual(set(SCHEMA['required']), {'path', 'content', 'edits', 'read_files', 'validate'})
        self.assertEqual(SCHEMA['additionalProperties'], False)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name).resolve()
        (self.repo / 'one.ts').write_text('first\nsecond\nthird\n')

    def decode(self, text, target=None):
        return decode_action(text, self.repo, safe_path, target)

    def test_patch_updates_original_coordinates(self):
        files, _, _ = self.decode(action(path='one.ts', edits=[{'old': 'first', 'new': 'long replacement'}, {'old': 'third', 'new': 'last'}]))
        self.assertEqual(files[0]['content'], 'long replacement\nsecond\nlast\n')
        self.assertEqual((self.repo / 'one.ts').read_text(), 'first\nsecond\nthird\n')

    def test_failed_second_anchor_leaves_file_intact(self):
        with self.assertRaisesRegex(ValueError, 'matches=0'):
            self.decode(action(path='one.ts', edits=[{'old': 'first', 'new': 'changed'}, {'old': 'missing', 'new': ''}]))
        self.assertTrue((self.repo / 'one.ts').read_text().startswith('first'))

    def test_overlapping_and_ambiguous_edits_fail(self):
        for edits in [[{'old': 'first', 'new': ''}, {'old': 'first\nsecond', 'new': ''}], [{'old': '\n', 'new': ''}]]:
            with self.subTest(edits=edits), self.assertRaises(ValueError):
                self.decode(action(path='one.ts', edits=edits))

    def test_mixed_operations_and_legacy_batch_rejected(self):
        for text in [action(path='one.ts', content='x', edits=[{'old': 'first', 'new': 'y'}]), '{"files":[],"read_files":[]}']:
            with self.assertRaises(ValueError): self.decode(text)

    def test_wrong_target_and_noop_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Guarded target'):
            self.decode(action(path='other.ts', content='x'), 'one.ts')
        with self.assertRaisesRegex(ValueError, 'No-op'):
            self.decode(action(path='one.ts', content=(self.repo / 'one.ts').read_text()))

    def test_reads_validation_and_bounded_actions(self):
        self.assertTrue(self.decode(action(validate=True))[2])
        self.assertEqual(self.decode(action(read_files=['one.ts']))[1], ['one.ts'])
        with self.assertRaises(ValueError): self.decode(action(read_files=['x'] * 6))
        with self.assertRaises(ValueError): self.decode(action())


class ControllerTests(unittest.TestCase):
    def test_invalid_read_prevents_write_and_usage_is_retained(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve(); repo = root / 'repo'; repo.mkdir(); out = root / 'out'; out.mkdir()
            (repo / 'apps/api').mkdir(parents=True)
            (out / 'spec.md').write_text('Exact specification')
            task = {'prompt': 'Exact prompt', 'allowed_paths': ['apps/api/'], 'settings': {'model': 'fixture', 'context_tokens': 10000, 'timeout_seconds': 1, 'temperature': 0, 'max_output_tokens': 100, 'max_calls': 1, 'token_budget': 10000}}
            state = {'repo': str(repo), 'existing_axc_directories': []}
            adapter = Mock(); adapter.count.return_value = {'tokens': 20}; adapter.reset_cache.return_value = {'verified_unloaded': True}
            adapter.generate.return_value = {'usage': {'input_tokens': 20, 'output_tokens': 30, 'total_tokens': 50, 'cached_tokens': 0}, 'model': 'fixture', 'status': 'completed', 'provider_duration_ns': {}, 'text': action(path='apps/api/new.ts', content='safe', read_files=['missing.ts'])}
            with patch('coding_agent.coding_task.load', return_value=(state, task)), patch('coding_agent.source_paths', return_value=[]), patch('coding_agent.JsonAdapter', return_value=adapter):
                result = run(out, 'relevant_context')
            self.assertFalse((repo / 'apps/api/new.ts').exists())
            self.assertFalse(result['passed_local_checks'])
            self.assertEqual(json.loads((out / 'provider-usage.json').read_text())['calls'][0]['total_tokens'], 50)


class ProviderFailureTests(unittest.TestCase):
    def test_known_failed_usage_retained_and_missing_usage_unknown(self):
        from model_adapters import ModelError
        for counters in [None, {'input_tokens': 20, 'output_tokens': 30, 'cached_tokens': 0}]:
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp).resolve(); repo = root / 'repo'; repo.mkdir(); out = root / 'out'; out.mkdir()
                (out / 'spec.md').write_text('spec')
                state = {'repo': str(repo), 'existing_axc_directories': []}
                task = {'prompt': 'prompt', 'allowed_paths': ['apps/api/'], 'settings': {'model': 'fixture', 'context_tokens': 1000, 'timeout_seconds': 1, 'temperature': 0, 'max_output_tokens': 100, 'max_calls': 2, 'token_budget': 1000}}
                adapter = Mock(); adapter.count.return_value = {'tokens': 20}; adapter.reset_cache.return_value = {'verified_unloaded': True, 'model': 'fixture'}
                adapter.generate.side_effect = ModelError('failed response', usage=counters)
                with patch('coding_agent.coding_task.load', return_value=(state, task)), patch('coding_agent.source_paths', return_value=[]), patch('coding_agent.JsonAdapter', return_value=adapter):
                    result = run(out, 'relevant_context')
                ledger = json.loads((out / 'provider-usage.json').read_text())
                self.assertFalse(result['passed_local_checks'])
                self.assertEqual(len(ledger['calls']), 1)
                self.assertEqual(ledger['complete'], counters is not None)
                self.assertEqual(ledger['calls'][0].get('total_tokens'), 50 if counters else None)


class EvidenceTests(unittest.TestCase):
    def test_vitest_project_failure_cannot_hide_behind_passing_copy(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); test = root / 'a.test.ts'; report = root / 'report.json'
            report.write_text(json.dumps({'testResults': [
                {'name': str(test), 'status': 'passed', 'assertionResults': [{'status': 'passed'}]},
                {'name': str(test), 'status': 'failed', 'assertionResults': [{'status': 'failed'}]}]}))
            self.assertFalse(parse_evidence(report, 'vitest', [test])[str(test.resolve())]['passed'])

    def test_undiscovered_and_skipped_tests_fail(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); test = root / 'a.test.ts'; report = root / 'report.json'
            for results in [[], [{'name': str(test), 'status': 'passed', 'assertionResults': [{'status': 'pending'}]}]]:
                report.write_text(json.dumps({'testResults': results}))
                self.assertFalse(parse_evidence(report, 'vitest', [test])[str(test.resolve())]['passed'])

    @unittest.skipUnless(shutil.which('node'), 'Node runtime unavailable')
    def test_real_node_execution_and_docs_gate(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve(); repo = root / 'repo'; repo.mkdir(); pkg = repo / 'apps/api'; pkg.mkdir(parents=True)
            name = 'apps/api/test/courses.test.mjs'; test = repo / name; test.parent.mkdir()
            test.write_text("import test from 'node:test'; import assert from 'node:assert/strict'; test('real assertion',()=>assert.equal(1+1,2));")
            (pkg / 'package.json').write_text(json.dumps({'scripts': {'test:courses': 'node --test test/courses.test.mjs'}}))
            doc = 'apps/docs/docs/courses.md'; (repo / doc).parent.mkdir(parents=True)
            (repo / doc).write_text('/api/courses q modality status tag page pageSize sort items totalItems totalPages INVALID_QUERY_PARAMETER details')
            result = evaluate(repo, 'unused', root / 'passed', changed=[name, doc])
            self.assertTrue(result['passed'], result)
            test.write_text("import test from 'node:test'; test.skip('skipped',()=>{});")
            result = evaluate(repo, 'unused', root / 'skipped', changed=[name, doc])
            self.assertFalse(result['passed'])

    def test_unregistered_test_cannot_pass_presence_gate(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); repo = root / 'repo'; repo.mkdir(); name = 'packages/axc-verification/src/course.test.ts'
            (repo / name).parent.mkdir(parents=True); (repo / name).write_text('placeholder')
            self.assertFalse(evaluate(repo, 'unused', root / 'out', changed=[name])['tests_passed'])


class ComparisonTests(unittest.TestCase):
    def records(self):
        shared = {'prompt_sha256': 'prompt', 'spec_sha256': 'spec', 'base_commit': 'base', 'model_identity': 'same-model', 'acceptance_sha256': 'same-checks', 'tool_versions': {'node': 'test'}, 'settings': {'token_budget': 300000}, 'cache_policy': 'cold'}
        def row(label, tokens):
            return {'label': label, 'repetition': 1, 'execution': 'external_no_harness' if label == 'no_harness' else 'version_adapter', 'conditions': shared, 'quality_passed': True, 'ledger': {'complete': True, 'calls': [{'source': 'provider', 'model': 'same-model', 'input_tokens': tokens, 'output_tokens': 10, 'cached_tokens': 0, 'cache_reset': {'verified_unloaded': True}}]}}
        return [row('no_harness', 100), row('v7.10', 50)]

    def test_no_harness_is_actual_reference_and_all_calls_count(self):
        rows = self.records(); result = compare(rows, 1)['comparisons']['v7.10']
        self.assertTrue(result['token_savings_claim_supported'])
        rows[1]['ledger']['calls'].append(dict(rows[1]['ledger']['calls'][0], input_tokens=60))
        self.assertFalse(compare(rows, 1)['comparisons']['v7.10']['token_savings_claim_supported'])

    def test_bad_provenance_quality_counters_and_conditions_block(self):
        for change in ['provenance', 'quality', 'unknown', 'model', 'cache', 'tools', 'empty']:
            rows = copy.deepcopy(self.records())
            if change == 'provenance': rows[0]['execution'] = 'version_adapter'
            elif change == 'quality': rows[1]['quality_passed'] = False
            elif change == 'unknown': rows[1]['ledger']['calls'][0]['source'] = 'estimated'
            elif change == 'model': rows[1]['conditions']['model_identity'] = 'other'
            elif change == 'cache': rows[1]['ledger']['calls'][0]['cached_tokens'] = 999
            elif change == 'tools': rows[1]['conditions']['tool_versions']['node'] = None
            elif change == 'empty': rows[1]['ledger']['calls'] = []
            with self.subTest(change=change):
                self.assertFalse(compare(rows, 1)['comparisons']['v7.10']['token_savings_claim_supported'])

    def test_missing_repetitions_cannot_qualify(self):
        self.assertFalse(compare(self.records(), 2)['comparisons']['v7.10']['token_savings_claim_supported'])

    def test_patch_release_labels_preserve_comparison_gates(self):
        rows = self.records(); rows[1]['label'] = 'v7.12.1'
        self.assertTrue(compare(rows, 1)['comparisons']['v7.12.1']['token_savings_claim_supported'])
        rows[1]['quality_passed'] = False
        self.assertFalse(compare(rows, 1)['comparisons']['v7.12.1']['token_savings_claim_supported'])


if __name__ == '__main__':
    unittest.main()

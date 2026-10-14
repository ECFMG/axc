"""Persistence, bounded retrieval, real worker termination, and human-review gates."""

import copy
import io
import json
import re
import tempfile
import time
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import harness
import teaching_review
import workflow as w
from common import append_json, read_journal
from context import bounded_catalog
from isolation import IsolatedAdapter
from model_adapters import ModelError, MockAdapter
from stress_test import CONFIG, TASK, record_task


class HangingAdapter(MockAdapter):
    def generate(self, request):
        time.sleep(60)
        return super().generate(request)


class HangingSources(dict):
    def __contains__(self, key):
        time.sleep(60)
        return super().__contains__(key)


class ImprovementChecks(unittest.TestCase):
    def test_append_persistence_avoids_growing_checkpoints_and_recovers(self):
        config = copy.deepcopy(CONFIG)
        config['limits'].update(repetitions=1, checkpoint_every=7)
        tasks = [record_task('persist-%s' % index) for index in range(30)]
        with tempfile.TemporaryDirectory() as temp, redirect_stderr(io.StringIO()):
            directory = Path(temp) / 'run'
            with patch.object(w, 'save', wraps=w.save) as saved:
                report = w.benchmark(config, dict(split='eval', tasks=tasks), [], MockAdapter(), directory)
            result_writes = [call for call in saved.call_args_list if call.args[0].name == 'results.json']
            self.assertEqual(len(result_writes), 2)
            self.assertEqual(list(read_journal(directory / 'workflows.jsonl')), report['workflows'])
            # A killed append leaves a partial final record. Complete rows survive.
            with (directory / 'workflows.jsonl').open('a') as handle:
                handle.write('{"partial":')
            append_json(directory / 'calls.jsonl', dict(kind='call_started', task_id='pending', repetition=0,
                                                       call_index=0, request_hash='unknown-request'))
            recovered = w.recover(directory, Path(temp) / 'recovered')
            self.assertEqual(recovered['summary']['tasks'], 30)
            self.assertEqual(len(recovered['reconciliation']['unknown_inflight_calls']), 1)
            with self.assertRaisesRegex(ValueError, 'Incomplete run'):
                w.compare(report, recovered)

    def test_catalog_is_bounded_and_omitted_handles_are_searchable(self):
        task = record_task()
        task['documents'] += [dict(id='noise-%s' % index, text='background') for index in range(5000)]
        task['documents'].append(dict(id='last', text='special_target=7'))
        options = dict(CONFIG['optimization'], source_bytes=512, catalog_entries=4)
        catalog = bounded_catalog(task, options)
        self.assertLessEqual(len(catalog.encode()), 512)
        self.assertNotIn('[ref=doc:last]', catalog)
        found = w.read_detail(w.sources_for(task), dict(ref='catalog', query='special_target', start=0, limit=10), 20, 512)
        self.assertIn('[ref=doc:last]', found)
        self.assertLessEqual(len(found.encode()), 512)

    def test_unicode_chunk_pages_reconstruct_original_text(self):
        text = 'é🌱汉字' * 1000
        pieces, position = [], 0
        while position < len(text):
            result = w.read_detail({'doc:text': text}, dict(ref='chunk:doc:text', query='', start=position, limit=137), 20, 512)
            self.assertLessEqual(len(result.encode()), 512)
            header, body = result.split('\n', 1)
            next_position = int(re.search(r'next_start=(\d+)', header).group(1))
            self.assertGreater(next_position, position)
            pieces.append(body)
            position = next_position
        self.assertEqual(''.join(pieces), text)

    def test_large_single_line_recovers_answer_and_preserves_user_constraints(self):
        task = record_task()
        task['documents'] = []
        task['tool_results'] = [dict(id='large', text='x' * 1_000_000 + '\nanswer="chlorophyll"')]
        config = copy.deepcopy(CONFIG)
        config['optimization'].update(source_bytes=512, catalog_entries=2)
        result = w.execute(task, config, ['bounded_sources', 'tool_limit'], MockAdapter(), 'large-line')
        self.assertTrue(result['initial_success'], result['attempts'])
        self.assertFalse(result['fallback'])
        for call in result['calls']:
            self.assertIn(dict(role='user', content='audience="beginner"'), call['request']['input'])
        for event in result['events']:
            if event['kind'] == 'tool':
                self.assertLessEqual(len(event['output'].encode()), 512)

    def test_required_tool_text_is_never_silently_chunked(self):
        task = record_task()
        task['tool_results'] = [dict(id='required', text='essential ' * 1000, required_lines=[1])]
        with self.assertRaisesRegex(ValueError, 'Required tool content'):
            w.prepare(task, ['bounded_sources'], CONFIG)

    def test_unsuccessful_search_does_not_echo_an_oversized_query(self):
        output = w.read_detail({'doc:text': 'small source'},
                               dict(ref='doc:text', query='x' * 10000, start=0, limit=20), 20, 512, True)
        self.assertLessEqual(len(output.encode()), 512)
        self.assertIn('No match', output)

    def test_real_hung_adapter_is_terminated_and_usage_stays_unknown(self):
        config = copy.deepcopy(CONFIG)
        config['limits'].update(isolate_adapter=True, request_timeout_seconds=0.15)
        with IsolatedAdapter(HangingAdapter()) as adapter:
            adapter.timeout_seconds = 5
            adapter.count(dict(input=[], tools=[]))  # Finish spawn before measuring the hung operation.
            started = time.monotonic()
            result = w.execute(TASK, config, ['retrieve'], adapter, 'hung')
            self.assertLess(time.monotonic() - started, 2)
            self.assertFalse(adapter.process.is_alive())
            self.assertEqual(len(result['calls']), 1)
            self.assertFalse(result['fallback'])
            self.assertFalse(result['success'])
            self.assertIsNone(result['calls'][0]['usage'])
            self.assertGreater(result['budget_used_or_reserved'], 0)
            with self.assertRaisesRegex(ModelError, 'already stopped'):
                adapter.generate({})

    def test_real_hung_tool_is_terminated(self):
        with IsolatedAdapter(MockAdapter()) as adapter:
            adapter.timeout_seconds = 5
            adapter.count(dict(input=[], tools=[]))
            adapter.timeout_seconds = 0.15
            with self.assertRaisesRegex(ModelError, 'Hard timeout'):
                adapter.read_detail(HangingSources({'doc:slow': 'text'}),
                                    dict(ref='doc:slow', query='', start=0, limit=10), 20)
            self.assertFalse(adapter.process.is_alive())

    def test_worker_preserves_cache_state_between_workflows(self):
        config = copy.deepcopy(CONFIG)
        config['limits']['isolate_adapter'] = True
        with IsolatedAdapter(MockAdapter()) as adapter:
            first = w.execute(TASK, config, [], adapter, 'same')
            second = w.execute(TASK, config, [], adapter, 'same')
            self.assertEqual(first['cache_observed'], 'cold')
            self.assertEqual(second['cache_observed'], 'warm')
            self.assertTrue(first['success'] and second['success'])

    def test_isolation_preserves_tool_validation_failures(self):
        with IsolatedAdapter(MockAdapter()) as adapter:
            with self.assertRaisesRegex(ValueError, 'Unknown source'):
                adapter.read_detail({}, dict(ref='doc:missing', query='', start=0, limit=10), 20)
            self.assertTrue(adapter.process.is_alive())

    def teaching_fixture(self):
        suite = harness.validate(json.loads((w.ROOT / 'teaching-holdout.json').read_text()))
        old_ids = {case['id'] for case in json.loads((w.ROOT / 'teaching.json').read_text())['cases']}
        self.assertTrue(old_ids.isdisjoint({case['id'] for case in suite['cases']}))
        with tempfile.TemporaryDirectory() as temp, redirect_stderr(io.StringIO()):
            args = SimpleNamespace(demo=True, model='synthetic-demo', repeat=1, min_pass_rate=1, objective='tokens',
                                   min_savings=0.0, token_budget=30000, plan=False, optimize='total',
                                   out=Path(temp) / 'report.json')
            report = harness.run(suite, args, harness.demo_provider(suite))
        self.assertEqual(report['status'], 'completed')
        self.assertTrue(all(row['passed'] for row in report['rows']))
        guide = json.loads((w.ROOT / 'teaching-review-guide.json').read_text())
        return report, teaching_review.review_pack(report, guide)

    def test_human_review_is_blinded_pending_and_never_fabricated(self):
        report, reviews = self.teaching_fixture()
        self.assertTrue(all('variant' not in item and 'model' not in item for item in reviews['items']))
        assessed = teaching_review.assess(report, reviews, CONFIG['pricing'])
        self.assertEqual(assessed['pending_reviews'], 12)
        self.assertIsNone(assessed['selected_variant'])
        self.assertTrue(all(item['success_rate'] is None for item in assessed['summaries']))

    def test_review_tampering_duplicates_and_unobserved_learning_rejected(self):
        report, reviews = self.teaching_fixture()
        for mutation in ('duplicate', 'answer', 'learner'):
            edited = copy.deepcopy(reviews)
            if mutation == 'duplicate':
                edited['items'].append(edited['items'][0])
            elif mutation == 'answer':
                edited['items'][0]['answer'] = 'Different answer'
            else:
                edited['items'][0]['learner_transfer_correct'] = True
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                teaching_review.assess(report, edited, CONFIG['pricing'])

    def test_synthetic_review_cannot_become_verified_savings(self):
        report, reviews = self.teaching_fixture()
        for item in reviews['items']:
            item['ratings'] = {name: 5 for name in teaching_review.RATINGS}
            item['checks'] = {name: True for name in teaching_review.CHECKS}
            item['reviewer'] = 'Unit-test fixture, not a real reviewer'
        assessed = teaching_review.assess(report, reviews, CONFIG['pricing'])
        self.assertIsNone(assessed['selected_variant'])
        self.assertIn('synthetic demo; no real quality or savings claim', assessed['flags'])

    def test_human_failure_blocks_a_simulated_live_candidate(self):
        report, _ = self.teaching_fixture()
        # Exercise the live gate with a test fixture; no measured live results are created.
        report['mode'] = 'live'
        report['evaluation_hash'] = harness.evaluation_hash(report['suite'])
        for row in report['rows']:
            row['model'] = 'unit-test-provider'
        report['summary'][1]['eligible'] = True
        reviews = teaching_review.review_pack(report, json.loads((w.ROOT / 'teaching-review-guide.json').read_text()))
        for item in reviews['items']:
            item['ratings'] = {name: 5 for name in teaching_review.RATINGS}
            item['checks'] = {name: True for name in teaching_review.CHECKS}
            item['reviewer'] = 'Unit-test fixture'
        accepted = teaching_review.assess(report, reviews, CONFIG['pricing'])
        self.assertIsNotNone(accepted['selected_variant'])
        candidate_index = next(index for index, row in enumerate(report['rows']) if row['variant'] != 'baseline')
        identity = w.digest([w.digest(report), candidate_index])[:20]
        next(item for item in reviews['items'] if item['id'] == identity)['ratings']['factual_correctness'] = 3
        rejected = teaching_review.assess(report, reviews, CONFIG['pricing'])
        self.assertIsNone(rejected['selected_variant'])


if __name__ == '__main__':
    unittest.main()

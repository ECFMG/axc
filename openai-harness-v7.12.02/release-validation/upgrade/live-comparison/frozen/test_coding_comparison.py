import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from coding_comparison import compare


class CodingComparisonTests(unittest.TestCase):
    def runs(self):
        conditions = {key: 'same' for key in (
            'prompt_sha256', 'spec_sha256', 'base_commit', 'verification_sha256',
            'agent_sha256', 'runner_sha256', 'accounting_scope', 'protocol_sha256', 'task_contract_sha256',
        )}
        conditions.update(model_identity='digest', settings={'token_budget': 1000, 'max_calls': 20},
                          tool_versions={'python': '3'}, mandatory_check_count=8, expected_repetitions=2)
        rows = []
        for repetition in (1, 2):
            for name, tokens in [('baseline', 90), ('relevant_context', 50)]:
                call = {'source': 'provider', 'model': 'digest', 'actor': 'primary',
                        'input_tokens': tokens, 'output_tokens': 20, 'cached_tokens': 0,
                        'cache_reset': {'verified_unloaded': True}, 'status': 'completed', 'reasoning_output_tokens': 0}
                reviewer = dict(copy.deepcopy(call), actor='reviewer', input_tokens=8, output_tokens=2)
                row = {'variant': name, 'repetition': repetition,
                       'conditions': copy.deepcopy(conditions), 'quality_passed': True,
                       'controls': {'mode': 'controller_enforced', 'context_limits_applied': True,
                                    'fresh_review_executed': True, 'repair_checks_executed': True,
                                    'shared_budget_enforced': True},
                       'validation': {'checks': [{'exit_code': 0} for _ in range(8)],
                                      'scope_passed': True, 'spec_unchanged': True, 'branch_unchanged': True},
                       'ledger': {'complete': True, 'calls': [call, reviewer]}}
                self.reconcile_budget(row)
                rows.append(row)
        return rows

    def reconcile_budget(self, row):
        calls = row['ledger']['calls']
        row['budget'] = {
            'complete': True, 'budget_exhausted': False, 'unknown_usage': False,
            'limit_tokens': row['conditions']['settings']['token_budget'],
            'max_calls': row['conditions']['settings']['max_calls'],
            'reservations': {}, 'pending_reservations': [],
            'measured_tokens': sum(call['input_tokens'] + call['output_tokens'] for call in calls),
            'actors': {actor: {'complete': True,
                              'measured_tokens': sum(call['input_tokens'] + call['output_tokens']
                                                     for call in calls if call['actor'] == actor)}
                       for actor in ('primary', 'reviewer', 'reporting')},
        }
        row['budget']['actors']['reporting']['deterministic'] = True

    def test_approves_only_measured_quality_preserving_savings(self):
        result = compare(self.runs())
        self.assertTrue(result['token_savings_claim_supported'])
        self.assertEqual(result['blocking_reasons'], [])
        self.assertAlmostEqual(result['accepted_savings_percent'], 100 / 3)
        self.assertAlmostEqual(result['measured_total_token_reduction_percent'], 100 / 3)
        self.assertAlmostEqual(result['observed_total_token_change_percent'], -100 / 3)
        self.assertIsNone(result['hosted_cost_savings'])

    def test_changed_task_or_check_contract_cannot_qualify(self):
        rows = self.runs()
        rows[1]['conditions']['task_contract_sha256'] = 'changed-check-command'
        self.assertFalse(compare(rows)['token_savings_claim_supported'])

    def test_frozen_repetition_count_cannot_be_reduced_or_bypassed(self):
        with self.assertRaises(ValueError):
            compare(self.runs()[:2], expected_repetitions=1)
        rows = self.runs()
        for row in rows:
            row['conditions']['expected_repetitions'] = 3
        self.assertFalse(compare(rows)['token_savings_claim_supported'])

    def test_missing_reasoning_detail_prevents_complete_accounting_claim(self):
        rows = self.runs()
        del rows[1]['ledger']['calls'][1]['reasoning_output_tokens']
        self.assertFalse(compare(rows)['token_savings_claim_supported'])
        self.assertFalse(compare(rows)['variants']['relevant_context']['usage_complete'])

    def test_forecasts_never_change_report_or_comparability(self):
        rows = self.runs()
        before = compare(rows)
        for index, row in enumerate(rows):
            row['projection'] = {'total_tokens': index + 1, 'assumptions': 'arbitrary'}
            row['forecast_score'] = index + 1
            row['conditions']['projected_tokens'] = 999 - index
            row['conditions']['settings']['forecast'] = {'score': index}
            row['conditions']['settings']['expected_calls'] = 999 - index
            row['conditions']['settings']['input_tokens_per_call'] = index + 5
            row['ledger']['calls'][0]['projected_tokens'] = 99 - index
        self.assertEqual(compare(rows), before)

    def test_forecasts_cannot_fill_missing_reproducibility_evidence(self):
        rows = self.runs()
        for row in rows:
            row['conditions']['tool_versions'] = {}
        before = compare(rows)
        for index, row in enumerate(rows):
            row['conditions']['tool_versions']['forecast'] = {'future_version': index}
        self.assertEqual(compare(rows), before)
        self.assertFalse(before['token_savings_claim_supported'])

    def test_repair_calls_count_and_can_erase_savings(self):
        rows = self.runs()
        for row in rows:
            if row['variant'] == 'relevant_context':
                row['ledger']['calls'].append(copy.deepcopy(row['ledger']['calls'][0]))
                self.reconcile_budget(row)
        result = compare(rows)
        self.assertFalse(result['token_savings_claim_supported'])
        self.assertGreater(result['observed_total_token_change_percent'], 0)
        self.assertEqual(result['variants']['relevant_context']['total_tokens'], 300)

    def test_failed_rejected_and_retried_calls_count_even_after_success(self):
        rows = self.runs()
        for row in rows:
            if row['variant'] == 'relevant_context':
                for status in ('rejected', 'failed', 'retry'):
                    row['ledger']['calls'].append(dict(copy.deepcopy(row['ledger']['calls'][0]),
                                                     input_tokens=2, output_tokens=1, status=status))
                self.reconcile_budget(row)
        result = compare(rows)
        candidate = result['variants']['relevant_context']
        self.assertTrue(result['token_savings_claim_supported'])
        self.assertEqual(candidate['total_tokens'], 178)
        self.assertEqual(candidate['model_calls'], 10)
        self.assertEqual(candidate['success_rate'], 1)

    def test_failed_runs_stay_in_consumption_and_accepted_task_statistics(self):
        rows = self.runs()
        rows[1]['quality_passed'] = False
        result = compare(rows)
        candidate = result['variants']['relevant_context']
        self.assertFalse(result['token_savings_claim_supported'])
        self.assertEqual(candidate['runs'], 2)
        self.assertEqual(candidate['successes'], 1)
        self.assertEqual(candidate['success_rate'], .5)
        self.assertEqual(candidate['total_tokens'], 160)
        self.assertEqual(candidate['tokens_per_accepted_task'], 160)

    def test_cheaper_invalid_output_cannot_qualify(self):
        rows = self.runs()
        for row in rows:
            if row['variant'] == 'relevant_context':
                row['ledger']['calls'][0]['input_tokens'] = 0
                row['ledger']['calls'][0]['output_tokens'] = 0
                row['validation']['checks'][0]['exit_code'] = 1
                self.reconcile_budget(row)
        result = compare(rows)
        self.assertFalse(result['token_savings_claim_supported'])
        self.assertGreater(result['measured_total_token_reduction_percent'], 0)
        self.assertIsNone(result['accepted_savings_percent'])
        self.assertIsNone(result['variants']['relevant_context']['tokens_per_accepted_task'])
        self.assertEqual(result['variants']['relevant_context']['success_rate'], 0)

    def test_quality_requires_all_eight_mandatory_checks_and_fixed_scope(self):
        for issue in ('missing_validation', 'missing_check', 'extra_check', 'failed_check',
                      'unknown_check', 'boolean_check', 'scope', 'spec', 'branch', 'count'):
            rows = self.runs()
            row = rows[1]
            if issue == 'missing_validation': del row['validation']
            if issue == 'missing_check': row['validation']['checks'].pop()
            if issue == 'extra_check': row['validation']['checks'].append({'exit_code': 0})
            if issue == 'failed_check': row['validation']['checks'][0]['exit_code'] = 1
            if issue == 'unknown_check': row['validation']['checks'][0].clear()
            if issue == 'boolean_check': row['validation']['checks'][0]['exit_code'] = False
            if issue == 'scope': row['validation']['scope_passed'] = False
            if issue == 'spec': row['validation']['spec_unchanged'] = False
            if issue == 'branch': row['validation']['branch_unchanged'] = False
            if issue == 'count': row['conditions']['mandatory_check_count'] = 7
            with self.subTest(issue=issue):
                self.assertFalse(compare(rows)['token_savings_claim_supported'])

    def test_quality_or_conditions_or_unknown_usage_block_claim(self):
        for issue in ('quality', 'condition', 'cache', 'unknown', 'estimate', 'negative',
                      'boolean', 'model', 'missing_protocol', 'missing_accounting_scope'):
            rows = self.runs()
            row = rows[1]
            if issue == 'quality': row['quality_passed'] = False
            if issue == 'condition': row['conditions']['base_commit'] = 'different'
            if issue == 'cache': row['ledger']['calls'][0]['cached_tokens'] = None
            if issue == 'unknown': row['ledger']['complete'] = False
            if issue == 'estimate': row['ledger']['calls'][0]['source'] = 'estimate'
            if issue == 'negative': row['ledger']['calls'][0]['input_tokens'] = -1
            if issue == 'boolean': row['ledger']['calls'][0]['output_tokens'] = True
            if issue == 'model': row['ledger']['calls'][0]['model'] = 'other-model'
            if issue == 'missing_protocol': del row['conditions']['protocol_sha256']
            if issue == 'missing_accounting_scope': del row['conditions']['accounting_scope']
            with self.subTest(issue=issue):
                self.assertFalse(compare(rows)['token_savings_claim_supported'])

    def test_missing_or_pending_actor_usage_blocks_claim(self):
        for issue in ('reviewer', 'reporting', 'reviewer_counter', 'reporting_counter',
                      'reviewer_pending', 'reporting_pending', 'reviewer_call', 'call_actor',
                      'actor_counter_mismatch', 'total_mismatch', 'reporting_not_deterministic'):
            rows = self.runs()
            row = rows[1]
            actors = row['budget']['actors']
            if issue in ('reviewer', 'reporting'): del actors[issue]
            if issue == 'reviewer_counter': del actors['reviewer']['measured_tokens']
            if issue == 'reporting_counter': del actors['reporting']['measured_tokens']
            if issue == 'reviewer_pending': actors['reviewer']['complete'] = False
            if issue == 'reporting_pending': actors['reporting']['complete'] = False
            if issue == 'reviewer_call':
                row['ledger']['calls'].pop()
                self.reconcile_budget(row)
            if issue == 'call_actor': del row['ledger']['calls'][0]['actor']
            if issue == 'actor_counter_mismatch': actors['reviewer']['measured_tokens'] += 1
            if issue == 'total_mismatch': row['budget']['measured_tokens'] -= 1
            if issue == 'reporting_not_deterministic': actors['reporting']['deterministic'] = False
            with self.subTest(issue=issue):
                self.assertFalse(compare(rows)['token_savings_claim_supported'])

    def test_budget_unknown_exhausted_or_reserved_blocks_claim(self):
        for issue in ('missing', 'incomplete', 'exhausted', 'unknown', 'reservation', 'pending'):
            rows = self.runs()
            row = rows[1]
            if issue == 'missing': del row['budget']
            if issue == 'incomplete': row['budget']['complete'] = False
            if issue == 'exhausted': row['budget']['budget_exhausted'] = True
            if issue == 'unknown': row['budget']['unknown_usage'] = True
            if issue == 'reservation': row['budget']['reservations'] = {'pending-call': 10}
            if issue == 'pending': row['budget']['pending_reservations'] = ['pending-call']
            with self.subTest(issue=issue):
                self.assertFalse(compare(rows)['token_savings_claim_supported'])

    def test_budget_must_match_fixed_token_and_call_limits(self):
        for issue in ('missing_tokens', 'missing_calls', 'inflated_tokens', 'inflated_calls',
                      'tokens_exceeded', 'calls_exceeded', 'settings_missing', 'settings_legacy'):
            rows = self.runs()
            row = rows[1]
            if issue == 'missing_tokens': del row['budget']['limit_tokens']
            if issue == 'missing_calls': del row['budget']['max_calls']
            if issue == 'inflated_tokens': row['budget']['limit_tokens'] += 1
            if issue == 'inflated_calls': row['budget']['max_calls'] += 1
            if issue == 'tokens_exceeded':
                for selected in rows:
                    selected['conditions']['settings']['token_budget'] = 60
                    selected['budget']['limit_tokens'] = 60
            if issue == 'calls_exceeded':
                for selected in rows:
                    selected['conditions']['settings']['max_calls'] = 1
                    selected['budget']['max_calls'] = 1
            if issue == 'settings_missing': del row['conditions']['settings']['max_calls']
            if issue == 'settings_legacy': row['conditions']['settings'] = 'same'
            with self.subTest(issue=issue):
                self.assertFalse(compare(rows)['token_savings_claim_supported'])

    def test_legacy_and_native_advisory_controls_fail_closed(self):
        for issue in ('missing', 'advisory', 'context', 'review', 'repair', 'budget'):
            rows = self.runs()
            row = rows[1]
            if issue == 'missing': del row['controls']
            if issue == 'advisory': row['controls']['mode'] = 'native_advisory'
            if issue == 'context': row['controls']['context_limits_applied'] = False
            if issue == 'review': row['controls']['fresh_review_executed'] = False
            if issue == 'repair': row['controls']['repair_checks_executed'] = False
            if issue == 'budget': row['controls']['shared_budget_enforced'] = False
            with self.subTest(issue=issue):
                self.assertFalse(compare(rows)['token_savings_claim_supported'])

    def test_missing_duplicate_and_unmatched_pairs_block_claim(self):
        self.assertFalse(compare(self.runs()[:-1])['token_savings_claim_supported'])
        rows = self.runs()
        rows[3]['repetition'] = 1
        self.assertFalse(compare(rows)['token_savings_claim_supported'])
        rows = self.runs()
        rows[3]['repetition'] = 3
        self.assertIn('Repetition pairs differ', compare(rows)['blocking_reasons'])

    def test_partial_balanced_pair_cannot_qualify_early(self):
        result = compare(self.runs()[:2])
        self.assertFalse(result['token_savings_claim_supported'])
        self.assertIn('The predeclared repetitions are incomplete', result['blocking_reasons'])

    def test_expected_repetitions_must_be_positive_integer(self):
        for value in (0, 1, -1, True, 1.5, '2'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                compare(self.runs(), value)

    def test_no_reduction_is_not_a_savings_claim(self):
        rows = self.runs()
        for row in rows:
            if row['variant'] == 'relevant_context':
                row['ledger']['calls'][0]['input_tokens'] = 90
                self.reconcile_budget(row)
        result = compare(rows)
        self.assertFalse(result['token_savings_claim_supported'])
        self.assertEqual(result['measured_total_token_reduction_percent'], 0)
        self.assertIn('Candidate did not reduce total tokens', result['blocking_reasons'])

    def test_missing_time_and_cost_stay_null(self):
        rows = self.runs()
        result = compare(rows)
        for variant in result['variants'].values():
            self.assertIsNone(variant['model_latency_ms'])
            self.assertIsNone(variant['estimated_cost_usd'])
        for row in rows:
            for call in row['ledger']['calls']:
                call['latency_ms'] = 5
        self.assertEqual(compare(rows)['variants']['baseline']['model_latency_ms'], 20)
        del rows[0]['ledger']['calls'][0]['latency_ms']
        self.assertIsNone(compare(rows)['variants']['baseline']['model_latency_ms'])

    def test_unknown_usage_is_not_reported_as_zero(self):
        rows = self.runs()
        rows[1]['ledger']['calls'][0]['input_tokens'] = None
        candidate = compare(rows)['variants']['relevant_context']
        self.assertIsNone(candidate['total_tokens'])
        self.assertIsNone(candidate['tokens_per_accepted_task'])
        self.assertFalse(candidate['usage_complete'])

    def test_malformed_or_empty_evidence_cannot_claim_savings(self):
        for rows in ([], [{}], [None], self.runs() + [{'variant': 'unknown'}]):
            with self.subTest(rows=rows):
                self.assertFalse(compare(rows)['token_savings_claim_supported'])
        rows = self.runs()
        rows[1]['ledger']['calls'].append(None)
        self.assertFalse(compare(rows)['token_savings_claim_supported'])

    def test_cli_accepts_predeclared_repetition_count(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = []
            for index, row in enumerate(self.runs()):
                path = Path(directory) / ('run-%s.json' % index)
                path.write_text(json.dumps(row))
                paths.append(str(path))
            out = Path(directory) / 'comparison.json'
            subprocess.run([sys.executable, '-B', str(Path(__file__).with_name('coding_comparison.py')),
                            *paths, '--out', str(out), '--expected-repetitions', '2'],
                           capture_output=True, text=True, check=True)
            result = json.loads(out.read_text())
            self.assertTrue(result['token_savings_claim_supported'])
            self.assertEqual(result['expected_repetitions'], 2)


if __name__ == '__main__':
    unittest.main()

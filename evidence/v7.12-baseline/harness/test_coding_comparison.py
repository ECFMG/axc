import copy
import unittest
from coding_comparison import compare


class CodingComparisonTests(unittest.TestCase):
    def runs(self):
        conditions = {k: 'same' for k in ('prompt_sha256', 'spec_sha256', 'base_commit', 'model_identity', 'verification_sha256', 'agent_sha256', 'runner_sha256', 'settings', 'tool_versions')}
        return [{'variant': name, 'repetition': repetition, 'conditions': conditions, 'quality_passed': True,
                 'ledger': {'complete': True, 'calls': [{'source': 'provider', 'model': 'digest', 'input_tokens': tokens,
                    'output_tokens': 20, 'cached_tokens': 0, 'cache_reset': {'verified_unloaded': True}}]}}
                for repetition in (1, 2) for name, tokens in [('baseline', 100), ('relevant_context', 60)]]

    def test_approves_only_measured_quality_preserving_savings(self):
        result = compare(self.runs())
        self.assertTrue(result['token_savings_claim_supported'])
        self.assertAlmostEqual(result['accepted_savings_percent'], 100/3)
        self.assertIsNone(result['hosted_cost_savings'])

    def test_repair_calls_count_and_can_erase_savings(self):
        runs = self.runs()
        for row in runs:
            if row['variant'] == 'relevant_context':
                row['ledger']['calls'].append(copy.deepcopy(row['ledger']['calls'][0]))
        result = compare(runs)
        self.assertFalse(result['token_savings_claim_supported'])
        self.assertGreater(result['observed_total_token_change_percent'], 0)

    def test_quality_or_conditions_or_unknown_usage_block_claim(self):
        for issue in ('quality', 'condition', 'cache', 'unknown', 'estimate'):
            runs = self.runs()
            row = runs[1]
            if issue == 'quality': row['quality_passed'] = False
            if issue == 'condition': row['conditions'] = {'fixed': 'changed'}
            if issue == 'cache': row['ledger']['calls'][0]['cached_tokens'] = None
            if issue == 'unknown': row['ledger']['complete'] = False
            if issue == 'estimate': row['ledger']['calls'][0]['source'] = 'estimate'
            with self.subTest(issue=issue):
                self.assertFalse(compare(runs)['token_savings_claim_supported'])

    def test_missing_or_duplicate_pairs_block_claim(self):
        self.assertFalse(compare(self.runs()[:-1])['token_savings_claim_supported'])
        runs = self.runs(); runs[3]['repetition'] = 1
        self.assertFalse(compare(runs)['token_savings_claim_supported'])

    def test_partial_balanced_pair_cannot_qualify_early(self):
        result = compare(self.runs()[:2])
        self.assertFalse(result['token_savings_claim_supported'])
        self.assertIn('The predeclared repetitions are incomplete', result['blocking_reasons'])


if __name__ == '__main__': unittest.main()

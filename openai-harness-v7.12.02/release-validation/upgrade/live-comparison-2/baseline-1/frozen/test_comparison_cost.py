import unittest
import test_coding_comparison
from coding_comparison import compare


class CostTests(unittest.TestCase):
    def test_cost_is_separate_from_tokens_and_unknown_latency_stays_null(self):
        rows = test_coding_comparison.CodingComparisonTests().runs()
        rates = {'input': 2, 'cached_input': .1, 'output': 10,
                 'cache_writes_in_input_rate': True, 'long_context_adjustment_required': False}
        report = compare(rows, rates=rates)
        for name in ['baseline', 'relevant_context']:
            self.assertIsNotNone(report['variants'][name]['estimated_cost_usd'])
            self.assertIsNone(report['variants'][name]['wall_elapsed_seconds'])
        self.assertTrue(report['estimated_cost_savings_claim_supported'])
        without_rates = compare(rows)
        self.assertIsNone(without_rates['variants']['baseline']['estimated_cost_usd'])
        self.assertFalse(without_rates['estimated_cost_savings_claim_supported'])

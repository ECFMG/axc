"""Regression checks for malformed adapters discovered by stress testing."""

import copy
import unittest

import stress_test as stress
import workflow as w
from model_adapters import ModelError, MockAdapter, usage


class AdapterContractChecks(unittest.TestCase):
    def test_corrupt_usage_and_response_shapes_fail_closed(self):
        self.assertEqual(stress.malformed_adapters()['cases'], 8)

    def test_valid_usage_survives_invalid_response_content(self):
        class InvalidContent(MockAdapter):
            def generate(self, request):
                result = super().generate(request)
                result['items'] = [None]
                return result

        result = w.execute(stress.TASK, stress.CONFIG, ['retrieve'], InvalidContent(), 'invalid')
        self.assertFalse(result['fallback'])
        self.assertFalse(result['success'])
        self.assertEqual(len(result['calls']), 1)
        self.assertGreater(result['calls'][0]['usage']['total_tokens'], 0)
        self.assertEqual(result['budget_used_or_reserved'], result['summary']['total_tokens'])

    def test_invalid_error_usage_reserves_budget_and_stops_retry(self):
        class InvalidError(MockAdapter):
            def generate(self, request):
                counts = usage(10, 2, 0, 'provider')
                counts['total_tokens'] = -100
                raise ModelError('transient with invalid counters', True, counts)

        result = w.execute(stress.TASK, stress.CONFIG, ['retrieve'], InvalidError(), 'invalid')
        self.assertEqual(len(result['calls']), 1)
        self.assertFalse(result['fallback'])
        self.assertGreater(result['budget_used_or_reserved'], 0)
        self.assertIsNone(result['calls'][0]['usage'])
        self.assertIsNone(result['summary']['estimated_cost_usd'])

    def test_bad_input_counts_never_start_generation(self):
        for response in (None, {}, {'tokens': True, 'source': 'provider_count'},
                         {'tokens': -1, 'source': 'provider_count'}):
            class InvalidCount(MockAdapter):
                def count(self, request):
                    return copy.deepcopy(response)

                def generate(self, request):
                    raise AssertionError('Generation must not start')

            with self.subTest(response=response):
                result = w.execute(stress.TASK, stress.CONFIG, ['retrieve'], InvalidCount(), 'invalid')
                self.assertEqual(result['calls'], [])
                self.assertFalse(result['fallback'])
                self.assertTrue(result['attempts'][0]['provider_error'])


if __name__ == '__main__':
    unittest.main()

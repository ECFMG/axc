import tempfile
from pathlib import Path
import unittest
from run_budget import SharedBudget, BudgetExceeded


class ReserveTests(unittest.TestCase):
    def test_primary_cannot_spend_review_capacity(self):
        with tempfile.TemporaryDirectory() as directory:
            budget = SharedBudget(Path(directory) / 'budget.json', 100, 3)
            budget.register_actor('primary')
            budget.register_actor('reviewer')
            budget.protect_actor('reviewer', 40, 1)
            first = budget.reserve('primary', 40, 20, 'implementation')
            budget.settle(first, {'input_tokens': 40, 'output_tokens': 20})
            with self.assertRaises(BudgetExceeded):
                budget.reserve('primary', 1, 1, 'would steal review budget')
            self.assertFalse(budget.snapshot()['budget_exhausted'])
            final = budget.reserve('reviewer', 30, 10, 'reserved review after primary denied')
            budget.settle(final, {'input_tokens': 30, 'output_tokens': 10})
            self.assertEqual(budget.snapshot()['measured_tokens'], 100)

    def test_reviewer_can_use_reserved_capacity(self):
        with tempfile.TemporaryDirectory() as directory:
            budget = SharedBudget(Path(directory) / 'budget.json', 100, 2)
            budget.register_actor('primary')
            budget.register_actor('reviewer')
            budget.protect_actor('reviewer', 40, 1)
            first = budget.reserve('primary', 40, 20, 'implementation')
            budget.settle(first, {'input_tokens': 40, 'output_tokens': 20})
            final = budget.reserve('reviewer', 30, 10, 'review')
            budget.settle(final, {'input_tokens': 30, 'output_tokens': 10})
            self.assertEqual(budget.snapshot()['measured_tokens'], 100)

    def test_oversized_primary_denial_preserves_review_pool(self):
        with tempfile.TemporaryDirectory() as directory:
            budget = SharedBudget(Path(directory) / 'budget.json', 100, 3)
            budget.register_actor('primary')
            budget.register_actor('reviewer')
            budget.protect_actor('reviewer', 40, 1)
            first = budget.reserve('primary', 40, 20, 'implementation')
            budget.settle(first, {'input_tokens': 40, 'output_tokens': 20})
            with self.assertRaises(BudgetExceeded):
                budget.reserve('primary', 40, 10, 'larger than remaining global pool')
            self.assertFalse(budget.snapshot()['budget_exhausted'])
            final = budget.reserve('reviewer', 30, 10, 'review still fits')
            budget.settle(final, {'input_tokens': 30, 'output_tokens': 10})
            self.assertEqual(budget.snapshot()['measured_tokens'], 100)

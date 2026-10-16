"""Shared actor accounting and concurrent reservation regression checks; no network."""

import multiprocessing
from pathlib import Path
import tempfile
import unittest

from model_adapters import ModelError
from run_budget import BudgetExceeded, SharedBudget


def usage(incoming=4, outgoing=2, cached=None, source="provider"):
    return dict(input_tokens=incoming, output_tokens=outgoing, total_tokens=incoming + outgoing,
                cached_tokens=cached, source=source)


class Adapter:
    def __init__(self, results=None):
        self.results = iter(results or [dict(status="completed", model="actual-model", usage=usage())])
        self.counts = 0
        self.generations = 0

    def count(self, request):
        self.counts += 1
        return dict(tokens=5, source="provider_count")

    def generate(self, request):
        self.generations += 1
        result = next(self.results)
        if isinstance(result, BaseException):
            raise result
        return result


def competing_reservation(path, actor, ready, start, results):
    budget = SharedBudget(path)
    ready.put(actor)
    start.wait(10)
    try:
        reservation = budget.reserve(actor, 4, 2, "generation")
        budget.settle(reservation, usage(), model="fixture")
        budget.close_actor(actor)
        results.put((actor, "reserved"))
    except BudgetExceeded:
        results.put((actor, "denied"))


class SharedBudgetTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / "shared-budget.json"
        self.request = dict(model="requested-model", max_output_tokens=3)

    def budget(self, tokens=100, calls=10):
        return SharedBudget(self.path, tokens, calls)

    def test_initialization_requires_fixed_positive_limits(self):
        with self.assertRaises(ValueError):
            SharedBudget(self.path)
        for tokens, calls in ((0, 1), (1, 0), (True, 1), (1, -1)):
            with self.subTest(tokens=tokens, calls=calls), self.assertRaises(ValueError):
                self.budget(tokens, calls)
        first = self.budget()
        self.assertEqual(first.snapshot(), SharedBudget(self.path, 100, 10).snapshot())
        with self.assertRaises(ValueError):
            SharedBudget(self.path, 101, 10)
        self.assertFalse(first.snapshot()["complete"])

    def test_shared_actors_and_deterministic_reporting_close(self):
        primary = self.budget()
        reviewer = SharedBudget(self.path)
        for actor in ("primary", "reviewer", "reporting"):
            primary.register_actor(actor)
        first = primary.reserve("primary", 5, 3, "generation", {"cache_reset": {"verified": True}})
        second = reviewer.reserve("reviewer", 5, 3, "review")
        self.assertEqual(primary.snapshot()["reserved_tokens"], 16)
        primary.settle(first, usage(cached=3), model="fixture")
        primary.close_actor("primary")
        reviewer.settle(second, usage(3, 1), model="fixture")
        reviewer.close_actor("reviewer")
        self.assertFalse(primary.snapshot()["complete"])
        primary.close_actor("reporting", deterministic=True)
        view = primary.snapshot()
        self.assertTrue(view["complete"])
        self.assertEqual(view["measured_tokens"], 10)  # Cached input is included once.
        self.assertEqual(view["budget_used_or_reserved"], 10)
        self.assertEqual(view["reservations"], {})
        self.assertEqual(view["pending_reservations"], [])
        self.assertEqual(view["actors"]["reporting"]["measured_tokens"], 0)
        self.assertTrue(view["actors"]["reporting"]["deterministic"])
        self.assertEqual(view["calls"][0]["cache_reset"], {"verified": True})
        self.assertEqual(view["calls"][1]["actor"], "reviewer")
        with self.assertRaises(ValueError):
            reviewer.reserve("primary", 1, 1, "after close")

    def test_duplicate_settlement_is_idempotent_but_conflicts_rejected(self):
        budget = self.budget()
        reservation = budget.reserve("primary", 5, 3, "generation")
        first = budget.settle(reservation, usage(), model="fixture")
        self.assertEqual(first, SharedBudget(self.path).settle(reservation, usage(), model="fixture"))
        with self.assertRaises(ValueError):
            budget.settle(reservation, usage(4, 3), model="fixture")
        self.assertEqual(budget.snapshot()["measured_tokens"], 6)
        self.assertEqual(budget.snapshot()["calls_used"], 1)

    def test_provider_optional_detail_aliases_are_retained_without_inventing_zero(self):
        budget = self.budget()
        first = budget.reserve("primary", 5, 3, "generation")
        counts = dict(input_tokens=4, output_tokens=2, cached_input_tokens=3, reasoning_output_tokens=1)
        budget.settle(first, counts, model="fixture")
        second = budget.reserve("primary", 5, 3, "repair")
        budget.settle(second, usage(), model="fixture")
        calls = budget.snapshot()["calls"]
        self.assertEqual(calls[0]["cached_tokens"], 3)
        self.assertEqual(calls[0]["reasoning_output_tokens"], 1)
        self.assertIsNone(calls[1]["cached_tokens"])
        self.assertIsNone(calls[1]["reasoning_output_tokens"])
        self.assertEqual(budget.snapshot()["measured_tokens"], 12)

    def test_token_denial_marks_incomplete_before_generation(self):
        budget = self.budget(tokens=13)
        adapter = Adapter([dict(status="completed", model="fixture", usage=usage())] * 2)
        budget.dispatch(adapter, self.request, "primary", "generation")
        with self.assertRaises(BudgetExceeded):
            SharedBudget(self.path).dispatch(adapter, self.request, "reviewer", "review")
        self.assertEqual(adapter.generations, 1)
        budget.close_actor("primary")
        budget.close_actor("reviewer", deterministic=True)
        view = budget.snapshot()
        self.assertTrue(view["budget_exhausted"])
        self.assertFalse(view["complete"])
        self.assertEqual(len(view["calls"]), 1)
        self.assertEqual(len(view["denied_reservations"]), 1)

    def test_global_call_limit_includes_pending_and_all_actors(self):
        budget = self.budget(calls=1)
        budget.reserve("primary", 5, 3, "generation")
        adapter = Adapter()
        with self.assertRaises(BudgetExceeded):
            SharedBudget(self.path).dispatch(adapter, self.request, "reviewer", "review", input_bound=5)
        self.assertEqual(adapter.counts, 0)
        self.assertEqual(adapter.generations, 0)
        self.assertEqual(budget.snapshot()["calls_used"], 1)

    def test_known_failed_usage_and_rejected_retry_are_retained_once(self):
        budget = self.budget()
        error = ModelError("retryable failure", True, usage(4, 1))
        adapter = Adapter([error, dict(status="rejected", model="fixture", usage=usage(3, 1)),
                           dict(status="completed", model="fixture", usage=usage())])
        with self.assertRaises(ModelError) as raised:
            budget.dispatch(adapter, self.request, "primary", "generation")
        self.assertIs(raised.exception, error)
        budget.dispatch(adapter, self.request, "primary", "retry")
        budget.dispatch(adapter, self.request, "primary", "retry")
        budget.close_actor("primary")
        view = budget.snapshot()
        self.assertEqual([call["status"] for call in view["calls"]], ["failed", "rejected", "completed"])
        self.assertEqual(view["measured_tokens"], 15)
        self.assertEqual(adapter.generations, 3)
        self.assertTrue(view["complete"])

    def test_unknown_failure_holds_reservation_and_blocks_retry(self):
        for error in (ModelError("unknown", True), OSError("transport failed"),
                      ModelError("bad usage", True, {**usage(), "total_tokens": -1})):
            with self.subTest(error=error), tempfile.TemporaryDirectory() as directory:
                budget = SharedBudget(Path(directory) / "budget.json", 100, 10)
                adapter = Adapter([error])
                with self.assertRaises(type(error)):
                    budget.dispatch(adapter, self.request, "primary", "generation")
                budget.close_actor("primary")
                view = budget.snapshot()
                self.assertTrue(view["unknown_usage"])
                self.assertFalse(view["complete"])
                self.assertEqual(view["measured_tokens"], 0)
                self.assertEqual(view["budget_used_or_reserved"], 8)
                self.assertEqual(len(view["calls"]), 1)
                self.assertIsNone(view["calls"][0]["cached_tokens"])
                with self.assertRaises(BudgetExceeded):
                    budget.dispatch(adapter, self.request, "reviewer", "retry")
                self.assertEqual(adapter.generations, 1)

    def test_no_response_with_unknown_or_estimated_usage_returns_free(self):
        for counts in (None, {**usage(), "input_tokens": True}, usage(source="estimated"),
                       usage(source="synthetic_estimate")):
            with self.subTest(counts=counts), tempfile.TemporaryDirectory() as directory:
                budget = SharedBudget(Path(directory) / "budget.json", 100, 10)
                adapter = Adapter([dict(status="completed", usage=counts)])
                with self.assertRaises(ValueError):
                    budget.dispatch(adapter, self.request, "primary", "generation")
                view = budget.snapshot()
                self.assertTrue(view["unknown_usage"])
                self.assertEqual(view["measured_tokens"], 0)
                self.assertEqual(view["budget_used_or_reserved"], 8)
                self.assertEqual(len(view["calls"]), 1)

    def test_output_or_input_overrun_is_retained_and_stops_future_dispatch(self):
        for counts in (usage(4, 4), usage(6, 1)):
            with self.subTest(counts=counts), tempfile.TemporaryDirectory() as directory:
                budget = SharedBudget(Path(directory) / "budget.json", 100, 10)
                adapter = Adapter([dict(status="completed", usage=counts)])
                with self.assertRaises(BudgetExceeded):
                    budget.dispatch(adapter, self.request, "primary", "generation")
                view = budget.snapshot()
                self.assertEqual(view["measured_tokens"], counts["total_tokens"])
                self.assertTrue(view["budget_exhausted"])
                with self.assertRaises(BudgetExceeded):
                    budget.dispatch(adapter, self.request, "reviewer", "review")
                self.assertEqual(adapter.generations, 1)

    def test_pending_actors_and_truncated_final_response_cannot_complete(self):
        budget = self.budget()
        reservation = budget.reserve("primary", 5, 3, "generation")
        budget.close_actor("primary")
        self.assertFalse(budget.snapshot()["actors"]["primary"]["complete"])
        self.assertFalse(budget.snapshot()["complete"])
        budget.settle(reservation, usage(), model="fixture", status="incomplete")
        view = budget.snapshot()
        self.assertEqual(view["reservations"], {})
        self.assertFalse(view["actors"]["primary"]["complete"])
        self.assertFalse(view["complete"])

    def test_bad_preflight_never_generates_or_reserves(self):
        budget = self.budget()
        adapter = Adapter()
        adapter.count = lambda request: dict(tokens=True)
        with self.assertRaises(ValueError):
            budget.dispatch(adapter, self.request, "primary", "generation")
        self.assertEqual(adapter.generations, 0)
        self.assertEqual(budget.snapshot()["calls"], [])
        self.assertEqual(budget.snapshot()["reservations"], {})

    def test_malformed_response_keeps_valid_usage_and_settles_exactly_once(self):
        for response in (dict(status="  ", usage=usage()),
                         dict(status="completed", model=[], usage=usage()),
                         dict(usage=usage())):
            with self.subTest(response=response), tempfile.TemporaryDirectory() as directory:
                budget = SharedBudget(Path(directory) / "budget.json", 100, 10)
                with self.assertRaises(ValueError):
                    budget.dispatch(Adapter([response]), self.request, "primary", "generation")
                view = budget.snapshot()
                self.assertEqual(view["measured_tokens"], 6)
                self.assertEqual(view["reservations"], {})
                self.assertEqual(len(view["calls"]), 1)
                self.assertEqual(view["calls"][0]["status"], "invalid_response")

    def test_processes_cannot_oversubscribe_shared_token_ceiling(self):
        budget = self.budget(tokens=10, calls=10)
        context = multiprocessing.get_context("spawn")
        ready, results, start = context.Queue(), context.Queue(), context.Event()
        processes = [context.Process(target=competing_reservation, args=(str(self.path), actor, ready, start, results))
                     for actor in ("primary", "reviewer")]
        try:
            for process in processes:
                process.start()
            for _ in processes:
                ready.get(timeout=10)
            start.set()
            outcomes = [results.get(timeout=10)[1] for _ in processes]
            for process in processes:
                process.join(10)
                self.assertEqual(process.exitcode, 0)
            self.assertCountEqual(outcomes, ["reserved", "denied"])
            self.assertEqual(len(budget.snapshot()["calls"]), 1)
            self.assertEqual(budget.snapshot()["measured_tokens"], 6)
        finally:
            for process in processes:
                if process.is_alive():
                    process.terminate()
                    process.join(10)
            ready.close()
            results.close()


if __name__ == "__main__":
    unittest.main()

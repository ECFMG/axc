"""Offline behavior checks: python3 -B -m unittest -v test_harness.py"""

import copy
import io
import json
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import harness as h


SUITE = h.validate(json.loads(Path(__file__).with_name("example.json").read_text()))
TEACHING = h.validate(json.loads(Path(__file__).with_name("teaching.json").read_text()))


def exercise(post=None, suite=SUITE, **overrides):
    with tempfile.TemporaryDirectory() as directory, redirect_stderr(io.StringIO()):
        options = dict(demo=True, model="synthetic-demo", repeat=2, min_pass_rate=1.0, objective='tokens',
                       min_savings=0.1, token_budget=20000, plan=False,
                       out=Path(directory) / "report.json")
        options.update(overrides)
        args = SimpleNamespace(**options)
        report = h.run(suite, args, post or h.demo_provider(suite))
        assert json.loads(args.out.read_text()) == report
        return report


class HarnessChecks(unittest.TestCase):
    def test_teaching_selects_useful_compression_and_keeps_review_visible(self):
        report = exercise(suite=TEACHING, optimize="output", repeat=1)
        self.assertEqual(report["status"], "completed")
        self.assertEqual(report["winner"], "caveman_ponytail")
        self.assertTrue(report["human_review_required"])
        self.assertEqual(len(report["rows"]), 12)
        self.assertEqual(report["summary"][1]["pass_rate"], 1)
        self.assertEqual(report["summary"][2]["pass_rate"], 0)
        self.assertGreater(report["summary"][1]["output_savings"], 0.1)
        for case in TEACHING["cases"]:
            payload = h.request_body(TEACHING["variants"][1], case, "test-model")
            self.assertNotIn("rubric", payload)
            self.assertNotIn("demo_outputs", payload)
            self.assertNotIn(case["demo_outputs"]["baseline"], payload["input"])

    def test_teaching_omissions_false_claims_and_word_limit_fail(self):
        case = TEACHING["cases"][0]
        answer = case["demo_outputs"]["caveman_ponytail"]
        paraphrase = answer.replace("equal-sized pieces", "same-sized units").replace("1/2 = 2/4", "1 / 2 = 2 / 4")
        self.assertTrue(h.grade(case, paraphrase)["passed"])
        self.assertIn("required:transfer_question", h.grade(case, answer.split("Check:")[0])["failed_checks"])
        self.assertIn("required:misconception", h.grade(case, answer.replace("Do not add denominators", "Add denominators"))["failed_checks"])
        self.assertIn("word_limit", h.grade(case, answer + " padding" * 300)["failed_checks"])
        percentages = TEACHING["cases"][3]
        false_answer = percentages["demo_outputs"]["caveman_ponytail"] + " The relative increase is 10%."
        self.assertIn("forbidden:wrong_relative_change", h.grade(percentages, false_answer)["failed_checks"])

    def test_different_missing_concepts_do_not_cancel_each_other(self):
        report = exercise(suite=TEACHING, repeat=1, optimize="output")
        for row in report["rows"]:
            if row["case"] == "fractions" and row["variant"] in ["baseline", "caveman_ponytail"]:
                check = "required:sum" if row["variant"] == "baseline" else "required:conversion_step"
                row["checks"][check] = False
                row["passed"] = False
        summary, winner = h.summarize(TEACHING, report["rows"], 1, 0.5, 0.1, "output", objective='tokens')
        self.assertEqual(summary[0]["case_passes"], summary[1]["case_passes"])
        self.assertIn("fractions/required:conversion_step", summary[1]["regressed_checks"])
        self.assertIsNone(winner)

    def test_output_savings_cannot_hide_increased_total_usage(self):
        report = exercise(suite=TEACHING, repeat=1, optimize="output")
        for row in report["rows"]:
            if row["variant"] == "caveman_ponytail":
                row["input_tokens"] += 1000
                row["total_tokens"] += 1000
        summary, winner = h.summarize(TEACHING, report["rows"], 1, 1, 0.1, "output", objective='tokens')
        self.assertGreater(summary[1]["output_savings"], 0)
        self.assertEqual(summary[1]["decision"], "total token regression")
        self.assertIsNone(winner)

    def test_invalid_rubric_fails_validation(self):
        for mutate in [lambda s: s["cases"][0].update(expected="extra"),
                       lambda s: s["cases"][0]["rubric"].update(required={}),
                       lambda s: s["cases"][0]["rubric"].update(required={"bad": "["}),
                       lambda s: s["cases"][0]["rubric"].update(max_words=False),
                       lambda s: s["cases"][0].update(demo_outputs={})]:
            suite = copy.deepcopy(TEACHING)
            mutate(suite)
            with self.assertRaises(ValueError):
                h.validate(suite)

    def test_complete_comparison_and_destructive_compaction(self):
        report = exercise()
        self.assertEqual(report["status"], "completed")
        self.assertEqual(report["winner"], "compact")
        self.assertEqual(len(report["rows"]), 18)
        self.assertEqual(report["summary"][1]["pass_rate"], 1)
        self.assertEqual(report["summary"][2]["regressed_cases"], ["billing", "search"])
        self.assertFalse(report["summary"][2]["eligible"])
        self.assertIsNone(h.summarize(SUITE, report["rows"], 2, 1.0, 0.99, objective='tokens')[1])
        # Repetitions contain every pair, while the first variant rotates.
        self.assertEqual([r["variant"] for r in report["rows"][:3]], ["baseline", "compact", "overtrimmed"])
        self.assertEqual([r["variant"] for r in report["rows"][9:12]], ["compact", "overtrimmed", "baseline"])

    def test_budget_and_plan_never_generate(self):
        paths = []

        def counting_only(path, payload, key):
            paths.append(path)
            self.assertEqual(path, "responses/input_tokens")
            self.assertEqual(set(payload), {"model", "instructions", "input"})
            return h.demo_post(path, payload, key)

        blocked = exercise(counting_only, token_budget=1)
        self.assertEqual(blocked["status"], "error")
        self.assertEqual(blocked["rows"], [])
        self.assertIsNone(blocked["winner"])
        planned = exercise(counting_only, plan=True)
        self.assertEqual(planned["status"], "planned")
        self.assertEqual(len(paths), 18)
        self.assertGreater(planned["planned_max_tokens"], 0)

    def test_missing_usage_stops_and_preserves_prior_results(self):
        generated = []

        def missing_usage(path, payload, key):
            response = h.demo_post(path, payload, key)
            if path == "responses":
                generated.append(payload)
                if len(generated) == 2:
                    del response["usage"]
            return response

        report = exercise(missing_usage)
        self.assertEqual(report["status"], "error")
        self.assertEqual(len(generated), 2)
        self.assertEqual(len(report["rows"]), 1)
        self.assertIsNone(report["winner"])
        self.assertIn("no measured usage", report["error"])

    def test_reservation_mismatch_stops_remaining_requests(self):
        generated = []

        def underestimated(path, payload, key):
            response = h.demo_post(path, payload, key)
            if path == "responses/input_tokens":
                response["input_tokens"] -= 1
            else:
                generated.append(payload)
            return response

        report = exercise(underestimated)
        self.assertEqual(report["status"], "error")
        self.assertEqual(len(generated), 1)
        self.assertEqual(len(report["rows"]), 1)
        self.assertIsNone(report["winner"])

    def test_incomplete_answers_fail_even_if_the_text_matches(self):
        def incomplete(path, payload, key):
            response = h.demo_post(path, payload, key)
            if path == "responses":
                response["status"] = "incomplete"
            return response

        report = exercise(incomplete)
        self.assertEqual(report["status"], "completed")
        self.assertIsNone(report["winner"])
        self.assertTrue(all(not r["passed"] for r in report["rows"]))
        self.assertTrue(all(r["total_tokens"] > 0 for r in report["rows"]))

    def test_case_regressions_cannot_hide_behind_equal_pass_rates(self):
        report = exercise()
        rows = copy.deepcopy(report["rows"])
        for row in rows:
            if row["case"] == "billing" and row["variant"] == "baseline":
                row["passed"] = False
            if row["case"] == "search" and row["variant"] == "compact":
                row["passed"] = False
        summary, winner = h.summarize(SUITE, rows, 2, 0.5, 0.1, objective='tokens')
        self.assertEqual(summary[0]["pass_rate"], summary[1]["pass_rate"])
        self.assertEqual(summary[1]["regressed_cases"], ["search"])
        self.assertIsNone(winner)

    def test_http_contract_and_usage_accounting(self):
        payload = h.request_body(SUITE["variants"][0], SUITE["cases"][0], "test-model")
        response = h.demo_post("responses", payload, "")
        response["output"].insert(0, {"type": "reasoning", "summary": []})
        response["usage"]["input_tokens_details"]["cached_tokens"] = 20
        response["usage"]["output_tokens_details"]["reasoning_tokens"] = 1
        with patch.object(h, "urlopen", return_value=io.BytesIO(json.dumps(response).encode())) as opened:
            result = h.measure(h.api_post("responses", payload, "test-key"))
        request = opened.call_args.args[0]
        self.assertEqual(request.full_url, "https://api.openai.com/v1/responses")
        self.assertEqual(request.get_header("Authorization"), "Bearer test-key")
        self.assertFalse(json.loads(request.data)["store"])
        self.assertNotIn("expected", json.loads(request.data))
        self.assertEqual(result["output"], "Revenue Systems")
        self.assertEqual(result["total_tokens"], result["input_tokens"] + result["output_tokens"])
        self.assertEqual(result["cached_tokens"], 20)
        self.assertEqual(result["reasoning_tokens"], 1)
        del response["usage"]["input_tokens_details"]
        self.assertIsNone(h.measure(response)["cached_tokens"])
        response["usage"]["input_tokens"] = True
        with self.assertRaises(ValueError):
            h.measure(response)

    def test_bad_config_rejected_before_requests(self):
        for mutate in [lambda s: s["variants"][1].update(name="baseline"),
                       lambda s: s["variants"][1].update(context_key="missing"),
                       lambda s: s["variants"][1].update(max_output_tokens=-1),
                       lambda s: s["cases"][0].update(expected=""),
                       lambda s: s.update(cases=[])]:
            suite = copy.deepcopy(SUITE)
            mutate(suite)
            with self.assertRaises(ValueError):
                h.validate(suite)


if __name__ == "__main__":
    unittest.main()

"""Measured efficiency reports stay deterministic and preserve accounting gaps."""
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest

from efficiency_metrics import summarize_usage
from usage_accounting import KEYS, codex_sessions, codex_usage, provider_usage


def counters(input_tokens=200, cached=100, output=40, reasoning=10):
    return dict(input_tokens=input_tokens, cached_input_tokens=cached,
                output_tokens=output, reasoning_output_tokens=reasoning,
                total_tokens=input_tokens + output)


def session_usage(counts=None, calls=2, **overrides):
    return dict(source='Codex token_count cumulative counters', model='fixture',
                session_id='primary', turn_id='original',
                measured_usage=counters() if counts is None else counts,
                complete=True, missing_usage=[], model_calls_recorded=calls,
                request_accounting_complete=True, **overrides)


def write_session(path, duplicate=False, omit_middle=False, complete=True):
    """A pre-task baseline, two original calls, then a large excluded follow-up."""
    def row(kind, payload):
        return {'timestamp': '2026-10-15T12:00:00Z', 'type': kind, 'payload': payload}
    def event(kind, **payload):
        return row('event_msg', {'type': kind, **payload})
    def count(n):
        return event('token_count', info={'total_token_usage': counters(n, n // 2, n // 5, 0),
                                          'last_token_usage': counters(100, 50, 20, 0)})
    rows = [count(100), event('task_started', turn_id='original')]
    if not omit_middle:
        rows.append(count(200))
        if duplicate:
            rows.append(deepcopy(rows[-1]))
    if complete:
        rows.append(row('response_item', {'role': 'assistant', 'phase': 'final_answer'}))
    rows.append(count(300))
    if duplicate:
        rows.append(deepcopy(rows[-1]))
    if complete:
        rows.append(event('task_complete', turn_id='original'))
    rows += [event('task_started', turn_id='followup'), count(10000)]
    path.write_text('\n'.join(json.dumps(value) for value in rows) + '\n')


class EfficiencyMetricsTests(unittest.TestCase):
    def test_known_single_session_and_input_are_unchanged(self):
        usage = session_usage()
        original = deepcopy(usage)
        summary = summarize_usage(usage)
        metrics = summary['overall']
        self.assertEqual(metrics['measured_usage'], counters())
        self.assertEqual(metrics['cached_input_ratio'], .5)
        self.assertAlmostEqual(metrics['output_token_ratio'], 1 / 6)
        self.assertEqual(metrics['model_calls_recorded'], 2)
        self.assertEqual(metrics['mean_input_tokens_per_model_call'], 100)
        self.assertEqual(metrics['flags']['unknown_metrics'], [])
        self.assertFalse(metrics['flags']['usage_incomplete'])
        self.assertEqual(summary['primary'], metrics)
        self.assertTrue(summary['agent_breakdown_available'])
        self.assertEqual(summary['subagents'], [])
        self.assertEqual(summary['cost']['status'], 'not_inferred')
        self.assertEqual(usage, original)
        self.assertEqual(summary, summarize_usage(usage))

    def test_missing_categories_remain_null_and_known_ratios_still_report(self):
        counts = counters()
        counts['cached_input_tokens'] = None
        counts['reasoning_output_tokens'] = None
        usage = session_usage(counts)
        usage.update(complete=False, missing_usage=['cached_input_tokens', 'reasoning_output_tokens'])
        metrics = summarize_usage(usage)['overall']
        self.assertIsNone(metrics['measured_usage']['cached_input_tokens'])
        self.assertIsNone(metrics['cached_input_ratio'])
        self.assertAlmostEqual(metrics['output_token_ratio'], 1 / 6)
        self.assertEqual(metrics['mean_input_tokens_per_model_call'], 100)
        self.assertTrue(metrics['flags']['usage_incomplete'])
        self.assertIn('measured_usage.reasoning_output_tokens', metrics['flags']['unknown_metrics'])
        self.assertEqual(metrics['missing_usage'], usage['missing_usage'])

    def test_totals_and_call_counts_are_not_inferred_from_other_counters_or_requests(self):
        usage = session_usage(calls=9)
        usage['measured_usage']['total_tokens'] = None
        usage['request_accounting_complete'] = False
        usage['request_usage'] = [counters(), counters()]
        metrics = summarize_usage(usage)['overall']
        self.assertIsNone(metrics['measured_usage']['total_tokens'])
        self.assertIsNone(metrics['output_token_ratio'])
        self.assertIsNone(metrics['model_calls_recorded'])
        self.assertIsNone(metrics['mean_input_tokens_per_model_call'])
        self.assertFalse(metrics['request_accounting_complete'])
        self.assertTrue(metrics['flags']['request_accounting_incomplete'])

    def test_missing_request_accounting_does_not_promote_a_recorded_count(self):
        usage = session_usage()
        del usage['request_accounting_complete']
        metrics = summarize_usage(usage)['overall']
        self.assertIsNone(metrics['request_accounting_complete'])
        self.assertIsNone(metrics['model_calls_recorded'])
        self.assertIsNone(metrics['mean_input_tokens_per_model_call'])

    def test_zero_usage_and_zero_calls_preserve_zero_with_undefined_ratios(self):
        metrics = summarize_usage(session_usage(dict.fromkeys(KEYS, 0), calls=0))['overall']
        self.assertEqual(metrics['measured_usage'], dict.fromkeys(KEYS, 0))
        self.assertEqual(metrics['model_calls_recorded'], 0)
        for key in ('cached_input_ratio', 'output_token_ratio', 'mean_input_tokens_per_model_call'):
            self.assertIsNone(metrics[key])
        self.assertNotIn('model_calls_recorded', metrics['flags']['unknown_metrics'])

    def test_multiple_agents_use_aggregate_counters_and_preserve_each_session(self):
        primary = session_usage(counters(200, 100, 40, 10), calls=2)
        reviewer = session_usage(counters(300, 0, 60, 20), calls=1)
        reviewer['session_id'] = 'reviewer'
        reviewer['model'] = 'review-model'
        usage = {'source': 'Independent Codex session cumulative-counter deltas',
                 'primary': primary, 'subagents': [reviewer], 'measured_usage': counters(500, 100, 100, 30),
                 'model_calls_recorded': 3, 'complete': True, 'missing_usage': []}
        summary = summarize_usage(usage)
        self.assertEqual(summary['overall']['measured_usage']['total_tokens'], 600)
        self.assertEqual(summary['overall']['cached_input_ratio'], .2)
        self.assertAlmostEqual(summary['overall']['mean_input_tokens_per_model_call'], 500 / 3)
        self.assertEqual(summary['primary']['mean_input_tokens_per_model_call'], 100)
        self.assertEqual(summary['subagents'][0]['mean_input_tokens_per_model_call'], 300)
        self.assertEqual(summary['subagents'][0]['session_id'], 'reviewer')
        self.assertEqual(summary['subagents'][0]['model'], 'review-model')
        # An unknown aggregate category cannot be replaced by a sum of child counters.
        usage['measured_usage']['cached_input_tokens'] = None
        self.assertIsNone(summarize_usage(usage)['overall']['cached_input_ratio'])
        reviewer.update(request_accounting_complete=False, model_calls_recorded=None)
        summary = summarize_usage(usage)
        self.assertFalse(summary['overall']['request_accounting_complete'])
        self.assertIsNone(summary['overall']['model_calls_recorded'])
        self.assertEqual(summary['primary']['model_calls_recorded'], 2)

    def test_provider_ledgers_preserve_complete_call_counts_with_unknown_token_categories(self):
        ledger = {'complete': True, 'calls': [{'source': 'provider', 'input_tokens': 50,
                                             'cached_tokens': None, 'output_tokens': 10}]}
        original = deepcopy(ledger)
        summary = summarize_usage(ledger)
        self.assertEqual(summary, summarize_usage(provider_usage(ledger)))
        metrics = summary['overall']
        self.assertFalse(metrics['complete'])
        self.assertTrue(metrics['request_accounting_complete'])
        self.assertEqual(metrics['model_calls_recorded'], 1)
        self.assertEqual(metrics['mean_input_tokens_per_model_call'], 50)
        self.assertIsNone(metrics['cached_input_ratio'])
        self.assertFalse(summary['agent_breakdown_available'])
        self.assertIsNone(summary['primary'])
        self.assertEqual(ledger, original)
        ledger['complete'] = False
        metrics = summarize_usage(ledger)['overall']
        self.assertFalse(metrics['request_accounting_complete'])
        self.assertIsNone(metrics['model_calls_recorded'])
        self.assertIn('ledger completeness not established', metrics['missing_usage'])

    def test_empty_provider_ledger_does_not_replace_unknown_counters_with_zero(self):
        metrics = summarize_usage({'complete': False, 'calls': []})['overall']
        self.assertEqual(metrics['measured_usage'], dict.fromkeys(KEYS))
        self.assertIsNone(metrics['model_calls_recorded'])
        self.assertIsNone(metrics['cached_input_ratio'])
        self.assertIsNone(metrics['output_token_ratio'])

    def test_known_provider_calls_preserve_real_zero_ratios(self):
        ledger = {'complete': True, 'calls': [{'source': 'provider', 'input_tokens': 50,
                                             'cached_tokens': 0, 'output_tokens': 0,
                                             'reasoning_output_tokens': 0}]}
        metrics = summarize_usage(provider_usage(ledger))['overall']
        self.assertTrue(metrics['complete'])
        self.assertEqual(metrics['model_calls_recorded'], 1)
        self.assertEqual(metrics['mean_input_tokens_per_model_call'], 50)
        self.assertEqual(metrics['cached_input_ratio'], 0)
        self.assertEqual(metrics['output_token_ratio'], 0)
        self.assertEqual(metrics['flags']['unknown_metrics'], [])

    def test_duplicate_snapshots_and_followup_are_excluded_end_to_end(self):
        with tempfile.TemporaryDirectory() as tmp:
            primary, reviewer = Path(tmp) / 'primary.jsonl', Path(tmp) / 'reviewer.jsonl'
            write_session(primary, duplicate=True)
            write_session(reviewer)
            source = primary.read_bytes()
            recorded = codex_sessions(primary, 'original', [(reviewer, 'original')])
            summary = summarize_usage(recorded)
            self.assertEqual(recorded['primary']['duplicate_counter_events'], 2)
            self.assertEqual(summary['overall']['measured_usage']['total_tokens'], 480)
            self.assertEqual(summary['overall']['model_calls_recorded'], 4)
            self.assertEqual(summary['overall']['mean_input_tokens_per_model_call'], 100)
            self.assertEqual(summary['primary']['measured_usage']['input_tokens'], 200)
            self.assertEqual(summary['primary']['model_calls_recorded'], 2)
            self.assertEqual(summary['subagents'][0]['model_calls_recorded'], 2)
            self.assertEqual(primary.read_bytes(), source)
            write_session(primary)
            without_duplicates = summarize_usage(codex_sessions(primary, 'original', [(reviewer, 'original')]))
            self.assertEqual(summary, without_duplicates)

    def test_missing_request_snapshot_keeps_original_totals_without_call_estimates(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'session.jsonl'
            write_session(path, omit_middle=True)
            metrics = summarize_usage(codex_usage(path, 'original'))['overall']
            self.assertTrue(metrics['complete'])
            self.assertEqual(metrics['measured_usage']['total_tokens'], 240)
            self.assertFalse(metrics['request_accounting_complete'])
            self.assertIsNone(metrics['model_calls_recorded'])
            self.assertIsNone(metrics['mean_input_tokens_per_model_call'])

    def test_pending_original_final_usage_remains_incomplete_despite_followup(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'session.jsonl'
            write_session(path, complete=False)
            metrics = summarize_usage(codex_usage(path, 'original'))['overall']
            self.assertFalse(metrics['complete'])
            self.assertIn('original final-response usage pending', metrics['missing_usage'])
            self.assertEqual(metrics['measured_usage']['total_tokens'], 240)
            self.assertEqual(metrics['model_calls_recorded'], 2)


if __name__ == '__main__':
    unittest.main()

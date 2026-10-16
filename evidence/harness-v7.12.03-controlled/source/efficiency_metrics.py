"""Descriptive metrics from imported usage; no model calls, pricing, or estimates."""
from copy import deepcopy

from usage_accounting import KEYS, provider_usage


def _counter(value):
    return value if type(value) is int and value >= 0 else None


def _ratio(numerator, denominator):
    if numerator is None or denominator is None or denominator == 0 or numerator > denominator:
        return None
    return numerator / denominator


def _request_complete(record):
    if 'request_accounting_complete' in record:
        value = record['request_accounting_complete']
        return value if type(value) is bool else None
    if 'calls_recorded' in record:
        # provider_usage records ledger completeness separately from unknown token categories.
        if record.get('source') == 'provider per-call counters (not cumulative snapshots)':
            return 'ledger completeness not established' not in record.get('missing_usage', [])
        return record.get('complete') is True
    return None


def _metrics(record, request_complete):
    counts = {key: _counter(record.get('measured_usage', {}).get(key)) for key in KEYS}
    calls = _counter(record.get('model_calls_recorded', record.get('calls_recorded')))
    if request_complete is not True:
        calls = None
    result = {key: record.get(key) for key in ('source', 'model', 'session_id', 'turn_id')}
    result.update(measured_usage=counts, complete=record.get('complete') is True,
                  missing_usage=deepcopy(record.get('missing_usage', [])),
                  request_accounting_complete=request_complete, model_calls_recorded=calls,
                  cached_input_ratio=_ratio(counts['cached_input_tokens'], counts['input_tokens']),
                  output_token_ratio=_ratio(counts['output_tokens'], counts['total_tokens']),
                  mean_input_tokens_per_model_call=counts['input_tokens'] / calls
                  if counts['input_tokens'] is not None and calls else None)
    unavailable = ['measured_usage.' + key for key, value in counts.items() if value is None]
    unavailable += [key for key in ('model_calls_recorded', 'cached_input_ratio', 'output_token_ratio',
                                   'mean_input_tokens_per_model_call') if result[key] is None]
    result['flags'] = {'usage_incomplete': not result['complete'],
                       'request_accounting_incomplete': request_complete is not True,
                       'unknown_metrics': unavailable}
    return result


def summarize_usage(usage):
    """Summarize codex_usage/codex_sessions/provider_usage output or a provider ledger.

    Token ratios describe the supplied measured scope, even when that scope is
    incomplete. Zero denominators remain null. Aggregate counters come directly
    from measured_usage; request snapshots are never summed or used as estimates.
    Provider ledgers do not establish primary/subagent attribution.
    """
    if 'calls' in usage and 'measured_usage' not in usage:
        usage = provider_usage(usage)
    provider = 'calls_recorded' in usage
    records = [usage['primary'], *usage.get('subagents', [])] if 'primary' in usage else [usage]
    sessions = [_metrics(record, _request_complete(record)) for record in records]
    completeness = [session['request_accounting_complete'] for session in sessions]
    complete = (False if False in completeness else
                True if all(value is True for value in completeness) else None)
    return {'kind': 'descriptive measured token volume and request metrics',
            'overall': _metrics(usage, complete),
            'agent_breakdown_available': not provider,
            'primary': sessions[0] if not provider else None,
            'subagents': sessions[1:] if not provider else [],
            'cost': {'status': 'not_inferred', 'reason': 'Requires separate explicit rates or billing data.'}}

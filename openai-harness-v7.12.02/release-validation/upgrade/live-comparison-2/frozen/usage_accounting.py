"""Measured usage only; projections and user-supplied price calculations stay separate."""
import json
import math
import re
from pathlib import Path

KEYS = ('input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens')


def codex_usage(log, turn_id):
    rows = []
    with Path(log).open() as stream:
        for line in stream:
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                break  # A live last line can still be in flight.
    starts = [i for i, row in enumerate(rows) if row.get('type') == 'event_msg'
              and row.get('payload', {}).get('type') == 'task_started']
    start = next((i for i in starts if rows[i]['payload'].get('turn_id') == turn_id), None)
    if start is None:
        raise ValueError('Original task_started turn ID not found in the supplied log.')
    end = next((i for i in starts if i > start and rows[i]['payload'].get('turn_id') != turn_id), len(rows))
    counts = lambda group: [r for r in group if r.get('type') == 'event_msg'
                           and r.get('payload', {}).get('type') == 'token_count'
                           and isinstance(r['payload'].get('info', {}).get('total_token_usage'), dict)]
    earlier, scoped = counts(rows[:start]), counts(rows[start:end])
    baseline = earlier[-1]['payload']['info']['total_token_usage'] if earlier else None
    basis = 'observed cumulative token_count before original task'
    if baseline is None:
        # Resumed/forked logs can carry inherited usage without an earlier snapshot.
        # Establish zero only if the first scoped event is explicitly its first call.
        first = scoped[0]['payload']['info'] if scoped else {}
        if first.get('total_token_usage') == first.get('last_token_usage') and first.get('total_token_usage'):
            baseline = dict.fromkeys(KEYS, 0)
            basis = 'session origin: first cumulative token_count equals its first-call usage; no pre-task snapshot'
    # Repeated token_count snapshots are notifications, not additional model calls.
    unique, previous, duplicate_count = [], baseline, 0
    request_usage, request_complete = [], baseline is not None
    for row in scoped:
        info = row['payload']['info']
        current = info['total_token_usage']
        if current == previous:
            duplicate_count += 1
            continue
        last_call = info.get('last_token_usage', {})
        matches = previous is not None and all(type(current.get(k)) is int and type(previous.get(k)) is int
                      and current[k] - previous[k] == last_call.get(k) for k in KEYS)
        request_complete &= matches
        request_usage.append({'timestamp': row['timestamp'], **{k: last_call.get(k) for k in KEYS}})
        unique.append(row)
        previous = current
    last = scoped[-1] if scoped else None
    finish = last['payload']['info']['total_token_usage'] if last else {}
    measured, missing = {}, []
    for key in KEYS:
        a, b = (baseline or {}).get(key), finish.get(key)
        if type(a) is int and type(b) is int and 0 <= a <= b:
            measured[key] = b - a
        else:
            measured[key] = None
            missing.append(key)
    if all(measured[k] is not None for k in ('input_tokens', 'cached_input_tokens')) and measured['cached_input_tokens'] > measured['input_tokens']:
        raise ValueError('Invalid cumulative counters: cached input exceeds input.')
    if all(measured[k] is not None for k in ('output_tokens', 'reasoning_output_tokens')) and measured['reasoning_output_tokens'] > measured['output_tokens']:
        raise ValueError('Invalid cumulative counters: reasoning exceeds output.')
    if all(measured[k] is not None for k in ('input_tokens', 'output_tokens', 'total_tokens')) and measured['total_tokens'] != measured['input_tokens'] + measured['output_tokens']:
        raise ValueError('Invalid cumulative counters: total differs from input plus output.')
    finals = [i for i in range(start, end) if rows[i].get('type') == 'response_item'
              and rows[i].get('payload', {}).get('role') == 'assistant'
              and rows[i]['payload'].get('phase') in ('final', 'final_answer')]
    completed = [r for r in rows[start:end] if r.get('type') == 'event_msg'
                 and r.get('payload', {}).get('type') in ('task_complete', 'task_completed')]
    final_accounted = bool(last and finals and completed and rows.index(last) > max(finals))
    if not final_accounted:
        missing.append('original final-response usage pending')
    models = [row.get('payload', {}).get('model') for row in rows[start:end] if row.get('type') == 'turn_context']
    session = next((row.get('payload', {}) for row in rows if row.get('type') == 'session_meta'), {})
    log_id = re.search(r'([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})(?:_|\.jsonl$)', Path(log).name)
    return {'model': next((model for model in reversed(models) if model), None),
            'session_id': log_id.group(1) if log_id else session.get('session_id') or session.get('id'),
            'source': 'Codex token_count cumulative counters', 'source_log': str(Path(log).resolve()),
            'turn_id': turn_id, 'task_start_timestamp': rows[start]['timestamp'],
            'task_end_timestamp': completed[-1]['timestamp'] if completed else None,
            'baseline': {'counters': baseline, 'basis': basis if baseline else 'unavailable'},
            'ending_snapshot': {'counters': finish, 'timestamp': last['timestamp'] if last else None},
            'measured_usage': measured, 'final_response_accounted_for': final_accounted,
            'model_calls_recorded': len(unique) if request_complete else None,
            'distinct_counter_events': len(unique), 'duplicate_counter_events': duplicate_count,
            'request_accounting_complete': bool(scoped and request_complete), 'request_usage': request_usage,
            'complete': not missing, 'missing_usage': missing,
            'scope': 'Original turn only, including inspection/planning/implementation/validation/reporting/final response. Later turns excluded. Supply each subagent log separately if used.',
            'rules': 'Subtract cumulative ending minus baseline, never sum snapshots. Cached input is inside input; reasoning output is inside output.'}


def provider_usage(ledger):
    calls = ledger.get('calls', [])
    measured = {}
    aliases = {'cached_input_tokens': 'cached_tokens'}
    for key in KEYS:
        values = []
        for call in calls:
            if call.get('source') != 'provider':
                values.append(None)
            elif key == 'total_tokens':
                a, b = call.get('input_tokens'), call.get('output_tokens')
                values.append(a + b if type(a) is int and type(b) is int and a >= 0 and b >= 0 else None)
            else:
                values.append(call.get(aliases.get(key, key)))
        measured[key] = sum(values) if values and all(type(v) is int and v >= 0 for v in values) else None
    invalid = any(type(c.get('cached_tokens')) is int and type(c.get('input_tokens')) is int
                  and c['cached_tokens'] > c['input_tokens'] for c in calls)
    if invalid:
        raise ValueError('Cached input cannot exceed input.')
    missing = [k for k, v in measured.items() if v is None]
    if ledger.get('complete') is not True:
        missing.append('ledger completeness not established')
    return {'source': 'provider per-call counters (not cumulative snapshots)', 'measured_usage': measured,
            'complete': not missing, 'missing_usage': missing, 'calls_recorded': len(calls),
            'scope': 'All supplied provider calls including failed/rejected/repair/retrieval calls. No unknown counters replaced by zero.'}


def estimated_cost(usage, rates):
    for key in ('input', 'cached_input', 'output'):
        value = rates.get(key)
        if type(value) not in (int, float) or not math.isfinite(value) or value < 0:
            raise ValueError('Rates require finite nonnegative input/cached_input/output prices per million.')
    counts = usage.get('measured_usage', {})
    a, c, b = (counts.get(k) for k in ('input_tokens', 'cached_input_tokens', 'output_tokens'))
    known = all(type(v) is int and v >= 0 for v in (a, c, b)) and c <= a
    # Cache-write and long-context prices are provider-specific. Never assume them away.
    simple = rates.get('cache_writes_in_input_rate') is True and rates.get('long_context_adjustment_required') is False
    amount = ((a - c) * rates['input'] + c * rates['cached_input'] + b * rates['output']) / 1000000 if known and simple else None
    return {'kind': 'estimate from measured counters and caller-supplied rates; not billed cost',
            'rates_per_million': rates, 'estimated_usd': amount,
            'scope_complete': usage.get('complete') is True,
            'limitations': [] if known and simple else ['Missing counters or cache-write/long-context pricing treatment not declared; no cost substituted.']}


def codex_sessions(log, turn_id, subagents=()):
    """Independent session deltas; repeated or overlapping sources fail closed."""
    sources = [(log, turn_id), *subagents]
    resolved = [str(Path(path).resolve()) for path, _ in sources]
    if len(set(resolved)) != len(resolved):
        raise ValueError('Supply each original session log once; overlapping turns can double-count usage.')
    records = [codex_usage(path, turn) for path, turn in sources]
    if len(records) == 1:
        return records[0]
    measured = {key: sum(record['measured_usage'][key] for record in records)
                if all(record['measured_usage'][key] is not None for record in records) else None for key in KEYS}
    models = {record.get('model') for record in records}
    missing = [dict(source_log=record['source_log'], turn_id=record['turn_id'], missing=record['missing_usage'])
               for record in records if not record['complete']]
    return {'source': 'Independent Codex session cumulative-counter deltas',
            'model': next(iter(models)) if len(models) == 1 else None,
            'primary': records[0], 'subagents': records[1:], 'measured_usage': measured,
            'complete': not missing, 'missing_usage': missing,
            'model_calls_recorded': sum(record['model_calls_recorded'] for record in records)
                if all(record['model_calls_recorded'] is not None for record in records) else None,
            'scope': 'Original primary and specified subagent turns, including their final responses. Follow-ups excluded; sessions remain separately recorded. Cached input is within input; reasoning output is within output.'}

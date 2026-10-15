"""Refresh only the original Task A turn's recorded usage; exclude follow-up turns."""
import datetime
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
KEYS = ['input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens']
ROOT_TURN = '01a14017-5066-7693-a4c9-36f789890dcc'
REVIEW_TURN = '01a1401a-c7e8-7f33-b745-ecb1bfbda540'
LOGS = Path('/Users/dfortun/.codex/sessions/2026/10/15')


def read_rows(path):
    rows = []
    for line in path.read_text().splitlines():
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue  # The active log can end with an unfinished write.
    return rows


def measure(path, turn):
    rows = read_rows(path)
    start = next(i for i, row in enumerate(rows)
                 if row.get('payload', {}).get('type') == 'task_started'
                 and row['payload'].get('turn_id') == turn)
    stop = next((i for i in range(start + 1, len(rows))
                 if rows[i].get('payload', {}).get('type') == 'task_complete'
                 and rows[i]['payload'].get('turn_id') == turn), None)
    # If completion is missing, never include a later turn's token events.
    next_start = next((i for i in range(start + 1, len(rows))
                       if rows[i].get('payload', {}).get('type') == 'task_started'
                       and rows[i]['payload'].get('turn_id') != turn), len(rows))
    end = min(stop if stop is not None else len(rows), next_start)
    def tokens(section):
        return [r for r in section if r.get('payload', {}).get('type') == 'token_count'
                and r['payload'].get('info', {}).get('total_token_usage') is not None]
    before = tokens(rows[:start])
    during = tokens(rows[start:end])
    baseline = before[-1]['payload']['info']['total_token_usage'] if before else dict.fromkeys(KEYS, 0)
    ending = during[-1]['payload']['info']['total_token_usage'] if during else None
    delta = {key: ending[key] - baseline[key] for key in KEYS} if ending else dict.fromkeys(KEYS, None)
    if ending:
        assert all(value >= 0 for value in delta.values())
        assert delta['total_tokens'] == delta['input_tokens'] + delta['output_tokens']
    return {
        'source_log': str(path), 'turn_id': turn,
        'start_timestamp': rows[start]['timestamp'],
        'baseline_basis': 'preceding cumulative snapshot' if before else 'fresh rollout counter origin; no preceding snapshot; zero inferred',
        'starting_cumulative_counters': {k: baseline[k] for k in KEYS},
        'ending_cumulative_counters': {k: ending[k] for k in KEYS} if ending else None,
        'recorded_through': during[-1]['timestamp'] if during else None,
        'task_complete_timestamp': rows[stop]['timestamp'] if stop is not None else None,
        'measured_usage': delta,
        'complete': stop is not None and bool(during),
        'final_response_accounted': stop is not None and bool(during),
        'calculation': 'ending cumulative counters minus starting cumulative counters; snapshots are not summed',
    }


usage = json.loads((OUT / 'usage.json').read_text())
main = measure(Path(usage['source_log']), ROOT_TURN)
review_path = LOGS / 'rollout-2026-10-15T11-07-39-01a1401a-c7a3-78d0-a846-aa32fce0c6b6.jsonl'
review = measure(review_path, REVIEW_TURN)
review['role'] = 'Cavecrew read-only code reviewer'
guardian_path = LOGS / 'rollout-2026-10-15T11-07-03-01a1401a-3acd-74b1-ab48-8b398cb485f9.jsonl'
guardians = []
for row in read_rows(guardian_path):
    payload = row.get('payload', {})
    if payload.get('type') == 'task_started' and payload.get('root_turn_id') == ROOT_TURN:
        item = measure(guardian_path, payload['turn_id'])
        item['role'] = 'Automatic permission review; system-created auxiliary agent'
        guardians.append(item)
records = [main, review, *guardians]
complete = all(r['complete'] for r in records)
aggregate = {key: sum(r['measured_usage'][key] for r in records) for key in KEYS}
usage.update({
    'task_id': 'TS-A-CATALOG-SEARCH', 'primary_agent': main,
    'subagents': [review], 'auxiliary_agents': guardians,
    'aggregate_recorded_usage': aggregate,
    'accounting_rules': 'Cached input is included in input. Reasoning output is included in output. Total equals input plus output. Disjoint agent/turn deltas are added once.',
    'status': 'complete' if complete else 'incomplete',
    'final_response_accounted': main['final_response_accounted'],
    'recorded_through': main['recorded_through'],
    'measurement_captured_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'missing_usage': [] if complete else ['Primary-agent usage after the last recorded token_count, including final reporting and final assistant response; counters pending.'],
    'excluded_usage': ['Superseded original turn 01a14015-8ae8-75f1-ab6a-99e48197b34d and its checkout preparation', 'All turns following the original edited task turn, including usage-recovery follow-up conversations'],
    'cost': {'measured_dollars': None, 'reason': 'No task-specific billed dollar counters available; no price estimate substituted.'},
    'recovery': 'Run outputs/recover_usage.py on the next user message before answering. It stops at original task_complete and excludes follow-up token events.',
})
usage['projection']['total_tokens'] = 3018000
(OUT / 'usage.json').write_text(json.dumps(usage, indent=2) + '\n')
print(json.dumps({'recorded_through': main['recorded_through'], 'primary': main['measured_usage'], 'review': review['measured_usage'], 'auxiliary': {k: sum(r['measured_usage'][k] for r in guardians) for k in KEYS}, 'aggregate': aggregate, 'complete': complete}, indent=2))

#!/usr/bin/env python3
"""Refresh only the original task and reviewer usage; exclude later turns."""
import datetime
import json
from pathlib import Path

OUTPUTS = Path(__file__).resolve().parent
FIELDS = ['input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens']

def measure(source, turn_id, baseline=None):
    rows = [json.loads(line) for line in Path(source).read_text().splitlines() if line.strip()]
    start = next(i for i, row in enumerate(rows) if row.get('payload', {}).get('type') == 'task_started' and row['payload'].get('turn_id') == turn_id)
    end = next((i for i in range(start + 1, len(rows)) if rows[i].get('payload', {}).get('type') == 'task_started'), len(rows))
    segment = rows[start:end]
    events = [(i, row) for i, row in enumerate(segment) if row.get('payload', {}).get('type') == 'token_count' and row['payload'].get('info', {}).get('total_token_usage')]
    earlier = [row for row in rows[:start] if row.get('payload', {}).get('type') == 'token_count' and row['payload'].get('info', {}).get('total_token_usage')]
    method = 'Provided task-start counters.'
    if baseline is None:
        if earlier:
            baseline = earlier[-1]['payload']['info']['total_token_usage']
            method = 'Last cumulative token_count before task_started.'
        elif events:
            info = events[0][1]['payload']['info']
            baseline = {key: info['total_token_usage'].get(key, 0) - info['last_token_usage'].get(key, 0) for key in FIELDS}
            method = 'New session: first cumulative minus first last_token_usage (zero baseline).'
    if not events:
        return {'source_log': source, 'turn_id': turn_id, 'complete': False, 'missing_usage': FIELDS, 'measured_usage': {key: None for key in FIELDS}}
    sample_index, sample = events[-1]
    counters = sample['payload']['info']['total_token_usage']
    measured = {key: counters[key] - baseline[key] if baseline is not None and key in counters and key in baseline else None for key in FIELDS}
    finals = [i for i,row in enumerate(segment) if row.get('type') == 'response_item' and row.get('payload',{}).get('type') == 'message' and row['payload'].get('role') == 'assistant' and row['payload'].get('phase') in ('final_answer','final')]
    completed = any(row.get('payload',{}).get('type') == 'task_complete' and row['payload'].get('turn_id') == turn_id for row in segment)
    complete = bool(completed and finals and sample_index > finals[-1] and all(value is not None for value in measured.values()))
    return {'source_log': source, 'turn_id': turn_id, 'task_started_at': rows[start]['timestamp'], 'starting_counters': baseline, 'baseline_method': method, 'ending_counters': counters, 'recorded_through': sample['timestamp'], 'sample_ordinal': sample.get('ordinal'), 'measured_usage': measured, 'final_response_accounted': complete, 'complete': complete, 'missing_usage': [] if complete else ['Original task final response and all work after latest token_count sample.']}

p = OUTPUTS / 'usage.json'
usage = json.loads(p.read_text())
main = measure(usage['source_log'],usage['turn_id'],usage['starting_counters'])
usage.update(main)
usage['subagents'] = [dict(session_id='01a15a84-8126-7ee0-b7f2-3e5b32f2846f', role='Cavecrew read-only reviewer', **measure('/Users/dfortun/.codex/sessions/2026/10/20/rollout-2026-10-20T14-13-15-01a15a84-8126-7ee0-b7f2-3e5b32f2846f.jsonl', '01a15a84-813d-7b33-9285-6da855ca91bd'))]
actors = [main,*usage['subagents']]
usage['combined_recorded_usage'] = {key: sum(actor['measured_usage'][key] for actor in actors) if all(actor['measured_usage'][key] is not None for actor in actors) else None for key in FIELDS}
usage['complete'] = all(actor['complete'] for actor in actors)
usage['status'] = 'complete' if usage['complete'] else 'recorded_usage_final_response_pending'
usage['accounting_note'] = 'Input includes cached input. Output includes reasoning output. Total = input + output. Cumulative counters are subtracted, never summed across snapshots. Actor differences are summed only for the combined recorded total.'
usage['missing_counters'] = [key for key in FIELDS if usage['combined_recorded_usage'][key] is None]
usage['missing_usage'] = [dict(turn_id=actor['turn_id'], missing=actor['missing_usage']) for actor in actors if actor['missing_usage']]
usage['updated_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
usage['monetary_cost'] = None
usage['cost_note'] = 'No billing or monetary-cost counters were available; no price estimate substituted for measured tokens.'
p.write_text(json.dumps(usage,indent=2)+'\n')
print(json.dumps({'recorded_through':usage['recorded_through'],'main':main['measured_usage'],'reviewer':usage['subagents'][0]['measured_usage'],'combined':usage['combined_recorded_usage'],'complete':usage['complete']},indent=2))

#!/usr/bin/env python3
"""Recover only the original task actors. Later conversation turns are excluded."""
import datetime
import json
from pathlib import Path

KEYS = ['input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens']
OUTPUT = Path(__file__).with_name('usage.json')

def measure(actor):
    rows = [json.loads(line) for line in Path(actor['source_log']).open()]
    turn_id = actor['turn_id']
    start = next(i for i, row in enumerate(rows) if row['type'] == 'event_msg' and row['payload'].get('type') == 'task_started' and row['payload'].get('turn_id') == turn_id)
    finish = next((i for i in range(start + 1, len(rows)) if rows[i]['type'] == 'event_msg' and rows[i]['payload'].get('type') == 'task_complete' and rows[i]['payload'].get('turn_id') == turn_id), None)
    next_start = next((i for i in range(start + 1, len(rows)) if rows[i]['type'] == 'event_msg' and rows[i]['payload'].get('type') == 'task_started' and rows[i]['payload'].get('turn_id') != turn_id), len(rows))
    stop = min(finish + 1 if finish is not None else len(rows), next_start)
    snapshots = [(i, row) for i, row in enumerate(rows) if row['type'] == 'event_msg' and row['payload'].get('type') == 'token_count' and row['payload'].get('info')]
    before = [row for i, row in snapshots if i < start]
    during = [row for i, row in snapshots if start <= i < stop]
    baseline = before[-1]['payload']['info']['total_token_usage'] if before else None
    baseline_method = 'Last cumulative token_count before task_started.'
    if baseline is None and during:
        first = during[0]['payload']['info']
        if first['total_token_usage'] == first['last_token_usage']:
            baseline = {key: 0 for key in KEYS}
            baseline_method = 'Fresh-session zero baseline reconstructed: first total_token_usage equals first last_token_usage; no earlier token_count exists.'
    endpoint = during[-1] if during else None
    ending = endpoint['payload']['info']['total_token_usage'] if endpoint else None
    measured = {key: ending.get(key) - baseline.get(key) if ending and baseline and ending.get(key) is not None and baseline.get(key) is not None else None for key in KEYS}
    complete = finish is not None and all(value is not None for value in measured.values())
    return {**actor, 'measurement_start_timestamp': rows[start]['timestamp'], 'baseline_snapshot_timestamp': before[-1]['timestamp'] if before else None, 'baseline_method': baseline_method, 'starting_cumulative_counters': {key: baseline.get(key) for key in KEYS} if baseline else None, 'ending_cumulative_counters': {key: ending.get(key) for key in KEYS} if ending else None, 'recorded_through': endpoint['timestamp'] if endpoint else None, 'task_complete_timestamp': rows[finish]['timestamp'] if finish is not None else None, 'measured_usage': measured, 'complete': complete, 'final_response_accounted_for': complete, 'unmeasured_counters': [] if complete else KEYS, 'missing_usage': [] if complete else ['Input, cached input, output, reasoning output, and total token increments after the latest token_count, including the pending final response.']}

record = json.loads(OUTPUT.read_text())
actors = [measure(actor) for actor in record['actors']]
record['actors'] = actors
record['updated_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
record['measured_usage'] = {key: sum(actor['measured_usage'][key] for actor in actors) if all(actor['measured_usage'][key] is not None for actor in actors) else None for key in KEYS}
record['main_usage'] = actors[0]['measured_usage']
record['subagent_usage'] = {key: sum(actor['measured_usage'][key] for actor in actors[1:]) if all(actor['measured_usage'][key] is not None for actor in actors[1:]) else None for key in KEYS}
record['complete'] = all(actor['complete'] for actor in actors)
record['final_response_accounted_for'] = record['complete']
record['status'] = 'complete_original_task_including_final_response' if record['complete'] else 'incomplete_final_response_pending'
record['missing_usage'] = [actor['role'] + ': ' + missing for actor in actors for missing in actor['missing_usage']]
OUTPUT.write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps({key: record[key] for key in ['updated_at', 'status', 'main_usage', 'subagent_usage', 'measured_usage', 'missing_usage']}, indent=2))

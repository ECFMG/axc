"""Refresh the harness follow-up's original turn only; no model call or validation."""
from pathlib import Path
import datetime
import glob
import json
import os
import sys

ROOT = Path(__file__).resolve().parent
source = ROOT / 'openai-harness-v7.12.03-controlled'
if not source.is_dir(): source = ROOT.parent / 'work/openai-harness-v7.12.03-controlled'
if not source.is_dir(): source = ROOT / 'source'
sys.path.insert(0, str(source))
from usage_accounting import codex_usage, KEYS

path = ROOT / 'harness-v7.12.03-controlled-usage.json'
if not path.exists(): path = ROOT / 'development-usage.json'
previous = json.loads(path.read_text())
root_turn = previous['turn_id']
primary = codex_usage(previous['source_log'], root_turn)
subagents, auxiliary = [], []
for logfile in glob.glob(os.path.expanduser('~/.codex/sessions/2026/10/*/*.jsonl')):
    rows = []
    for line in open(logfile):
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            break
    meta = rows[0].get('payload', {}) if rows else {}
    source = meta.get('source', {})
    origin = source.get('subagent', {}) if isinstance(source, dict) else {}
    for row in rows:
        event = row.get('payload', {})
        turn = event.get('turn_id')
        if event.get('type') != 'task_started' or event.get('root_turn_id') != root_turn or turn == root_turn:
            continue
        record = codex_usage(logfile, turn)
        record['role'] = origin.get('thread_spawn', {}).get('agent_path') or origin.get('other') or 'supporting agent'
        (auxiliary if origin.get('other') else subagents).append(record)
records = [primary, *subagents, *auxiliary]
aggregate = {key: sum(record['measured_usage'][key] for record in records)
             if all(record['measured_usage'][key] is not None for record in records) else None for key in KEYS}
complete = all(record['complete'] for record in records)
previous.update(primary=primary, subagents=subagents, auxiliary_agents=auxiliary,
                measured_usage=aggregate, recorded_through=primary['ending_snapshot']['timestamp'],
                status='complete' if complete else 'incomplete',
                final_response_accounted=primary['final_response_accounted_for'],
                missing_usage=[{'turn_id':record['turn_id'], 'missing':record['missing_usage']}
                               for record in records if not record['complete']],
                measurement_captured_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                scope='This controlled v7.12.03 amendment development turn and disjoint supporting-agent turns, including original final responses when available; excludes frozen Task A usage and all later follow-up conversations.',
                recovery='Run this file before answering the next user message. No later-turn token events are included.')
previous['projection_exceeded'] = (aggregate['total_tokens'] is not None and aggregate['total_tokens'] > previous['projection']['total_tokens'])
path.write_text(json.dumps(previous, indent=2) + '\n')
# Keep user-facing copies aligned without adding later-turn usage.
for destination in (ROOT / 'harness-v7.12.03-controlled-report/usage.json',):
    if destination.parent.is_dir(): destination.write_text(path.read_text())
print(json.dumps({'status':previous['status'], 'recorded_through':previous['recorded_through'],
                  'measured_usage':aggregate, 'supporting_agents':len(subagents)+len(auxiliary)}, indent=2))

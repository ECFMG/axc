import json, pathlib, datetime
root = pathlib.Path(__file__).resolve().parents[1]
out = pathlib.Path(__file__).resolve().with_name('usage.json')
u = json.loads(out.read_text())
rows=[]
for line in pathlib.Path(u['source_log']).read_text().splitlines():
 try: rows.append(json.loads(line))
 except json.JSONDecodeError: pass
start=next(i for i,r in enumerate(rows) if r.get('payload',{}).get('type')=='task_started' and r['payload'].get('turn_id')==u['turn_id'])
end=next((i for i in range(start+1,len(rows)) if rows[i].get('payload',{}).get('type') in ['task_complete','task_completed'] and rows[i]['payload'].get('turn_id')==u['turn_id']),None)
# A new task_started also bounds the original turn, excluding every follow-up token event.
next_start=next((i for i in range(start+1,len(rows)) if rows[i].get('payload',{}).get('type')=='task_started'),len(rows))
limit=min(end+1 if end is not None else len(rows),next_start)
def counter(r): return r.get('payload',{}).get('info',{}).get('total_token_usage')
prior=[r for r in rows[:start] if counter(r)]
scoped=[r for r in rows[start:limit] if counter(r)]
if not scoped: raise SystemExit('No scoped counters; preserving existing record.')
first,last=scoped[0],scoped[-1]
keys=['input_tokens','cached_input_tokens','output_tokens','reasoning_output_tokens','total_tokens']
if prior:
 baseline=counter(prior[-1]); baseline_at=prior[-1]['timestamp']; method='recorded cumulative snapshot preceding task_started'
else:
 last_call=first['payload']['info'].get('last_token_usage',{})
 baseline={k:counter(first).get(k,0)-last_call.get(k,0) for k in keys}
 baseline_at=u['task_started_at']; method='inferred from first cumulative minus first last_token_usage in fresh session; no pre-task token_count exists'
ending=counter(last)
measured={k:ending[k]-baseline[k] if k in ending and k in baseline else None for k in keys}
missing=[k for k,v in measured.items() if v is None]
final_seen=any(r.get('type')=='response_item' and r.get('payload',{}).get('role')=='assistant' and r['payload'].get('phase')=='final_answer' for r in rows[start:limit])
# task_complete plus last token_count after the final message confirms final accounting.
final_indices=[i for i in range(start,limit) if rows[i].get('type')=='response_item' and rows[i].get('payload',{}).get('role')=='assistant' and rows[i]['payload'].get('phase')=='final_answer']
last_index=max(i for i in range(start,limit) if counter(rows[i]))
complete=end is not None and bool(final_indices) and last_index>max(final_indices) and not missing
u.update({'starting_cumulative_counters':baseline,'baseline_timestamp':baseline_at,'baseline_method':method,'ending_cumulative_counters':ending,'recorded_usage':measured,'recorded_through':last['timestamp'],'measurement_updated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'end_boundary':{'task_complete_timestamp': rows[end]['timestamp'] if end is not None else None,'final_response_seen':final_seen,'final_response_accounted':complete,'followup_turns_excluded':True},'completeness':'complete' if complete else 'incomplete','missing_usage':missing+([] if complete else ['Original final assistant response counters are not yet confirmed; reporting tail may also be pending.']),'subagents':{'used':False,'usage':[]},'accounting_rules':{'method':'ending cumulative counters minus starting cumulative counters; cumulative snapshots never summed','cached_input_included_in_input':True,'reasoning_output_included_in_output':True},'estimated_cost':u.get('estimated_cost'),'cost_note':'No billing counters or verified price schedule used. Token projection is separate from measured usage.'})
out.write_text(json.dumps(u,indent=2)+'\n')
print(json.dumps({'recorded_through':u['recorded_through'],'recorded_usage':measured,'completeness':u['completeness']},indent=2))

"""Usage aggregation, fair comparisons, and readable reports; no model I/O."""


import json

from common import require


def cost(counts, pricing):
    if counts is None:
        return None
    cached = counts["cached_tokens"] or 0
    return ((counts["input_tokens"] - cached) * pricing["input_per_million"]
            + cached * pricing["cached_input_per_million"]
            + counts["output_tokens"] * pricing["output_per_million"]) / 1_000_000


def totals(records):
    calls = [c for r in records for c in r["calls"]]
    known = [c["usage"] for c in calls if c["usage"] is not None]
    success = sum(r["success"] for r in records)
    result = dict(tasks=len(records), successes=success, success_rate=success / len(records) if records else None,
                  initial_success_rate=sum(r["initial_success"] for r in records) / len(records) if records else None,
                  fallbacks=sum(r["fallback"] for r in records), model_calls=len(calls),
                  tool_calls_reserved=sum(r.get("tool_calls_reserved", 0) for r in records),
                  retries=sum(c["retry"] for c in calls), unknown_usage_calls=len(calls) - len(known),
                  latency_ms=sum(r["latency_ms"] for r in records),
                  model_latency_ms=sum(c["latency_ms"] for c in calls),
                  tool_result_tokens_estimate=sum(c["tool_result_tokens_estimate"] for c in calls))
    for field in ("input_tokens", "output_tokens", "total_tokens"):
        result[field] = sum(u[field] for u in known)
    result["cached_tokens"] = sum(u["cached_tokens"] for u in known) if len(calls) == len(known) and all(u["cached_tokens"] is not None for u in known) else None
    result["estimated_cost_usd"] = sum(c["estimated_cost_usd"] for c in calls) if not result["unknown_usage_calls"] else None
    result["tokens_per_success"] = result["total_tokens"] / success if success and not result["unknown_usage_calls"] else None
    result["usage_sources"] = sorted({u["source"] for u in known})
    return result


def render_run(report):
    summary = report["summary"]
    lines = ["# Workflow benchmark", "", report["measurement_label"], "", "Pricing: " + report["config"]["pricing"]["label"],
             "", "Run status: " + report["status"],
             "", "Totals cover completed workflows. For interrupted work, inspect calls.jsonl; unmatched call_started entries have unknown usage.",
             "", "Strategies: " + (", ".join(report["strategies"]) or "baseline, unchanged"),
             "", "| Metric | Value |", "|---|---:|"]
    lines += ["| %s | %s |" % (key, value) for key, value in summary.items()]
    lines += ["", "Cold/warm labels below are scheduled first/repeat trials. Provider cache hits are reported separately.", "",
              "| Trial | Task | Success | Initial success | Fallback | Observed cache |", "|---|---|---|---|---|---|"]
    lines += ["| %s | %s | %s | %s | %s | %s |" % (r["cache_trial"], r["task_id"], r["success"], r["initial_success"], r["fallback"], r["cache_observed"]) for r in report["workflows"]]
    for phase, values in report["by_cache_trial"].items():
        lines += ["", "## " + phase, "", "```json", json.dumps(values, indent=2), "```"]
    lines += ["", "Tool-result token estimates are already included in input totals. Unknown usage makes totals lower bounds and cost unavailable.",
              "No LLM is used for retrieval, compaction, or evaluation. Their local latency is recorded; all generation/retry/fallback/tool-round usage is included."]
    return "\n".join(lines) + "\n"


def compare(baseline, candidate):
    for key in ("adapter", "dataset_hash", "split", "protocol_hash", "implementation_hash"):
        require(baseline[key] == candidate[key], "Unfair comparison: different " + key)
    for section in ("model", "pricing", "limits", "acceptance"):
        require(baseline["config"][section] == candidate["config"][section], "Unfair comparison: different " + section)
    require(not baseline["strategies"], "First result must be an unchanged baseline")
    require(baseline["status"] == candidate["status"] == "completed", "Incomplete run cannot be compared")
    a, b = baseline["summary"], candidate["summary"]
    for report in (baseline, candidate):
        require(bool(report['workflows']) and report['summary'] == totals(report['workflows']),
                'Unverifiable workflow summary; totals must match the call ledger')
    identities = lambda report: [(r["task_id"], r["repetition"], r["cache_trial"]) for r in report["workflows"]]
    require(identities(baseline) == identities(candidate), "Different task/trial conditions")
    require(len(set(identities(baseline))) == len(identities(baseline)), 'Duplicate workflow trials')
    models = lambda report: {c.get("actual_model") for r in report["workflows"] for c in r["calls"] if c.get("actual_model")}
    require(models(baseline) == models(candidate), "Different model versions served")
    changes = {key: ((b[key] - a[key]) / a[key] * 100 if a[key] not in (0, None) and b[key] is not None else None)
               for key in ("input_tokens", "output_tokens", "cached_tokens", "total_tokens", "tokens_per_success", "estimated_cost_usd", "latency_ms", "success_rate")}
    limits, flags = candidate["config"]["acceptance"], []
    for report in (baseline, candidate):
        planned = report.get('planned_trials')
        if planned is None:
            flags.append('planned trial accounting unavailable; rerun with the current harness')
        else:
            require(identities(report) == [(r['task_id'], r['repetition'], r['cache_trial']) for r in planned],
                    'Incomplete workflow trial coverage')
    if a['success_rate'] < limits['min_success_rate']:
        flags.append('baseline below minimum success rate; repair baseline before adoption')
    if b["success_rate"] < limits["min_success_rate"] or a["success_rate"] - b["success_rate"] > limits["max_success_drop"]:
        flags.append("task success regression")
    if a["initial_success_rate"] - b["initial_success_rate"] > limits["max_initial_success_drop"]:
        flags.append("initial task success regression (fallback does not hide it)")
    if b["fallbacks"] / b["tasks"] > limits["max_fallback_rate"]:
        flags.append("fallback rate exceeds threshold")
    for first, second in zip(baseline["workflows"], candidate["workflows"]):
        if first["success"] and not second["success"]:
            flags.append("regressed task: " + first["task_id"])
        if first['initial_success'] and not second['initial_success']:
            flags.append('initial task success regressed: ' + first['task_id'])
        if first["cache_observed"] != second["cache_observed"]:
            flags.append("cache conditions differ: " + first["task_id"])
    if a["unknown_usage_calls"] or b["unknown_usage_calls"] or "estimated" in a["usage_sources"] + b["usage_sources"]:
        flags.append("incomplete/estimated live accounting; savings are inconclusive")
    if ("provider" in a["usage_sources"] + b["usage_sources"]
            and (a["cached_tokens"] is None or b["cached_tokens"] is None)):
        flags.append("unknown live cache usage; cache comparison is inconclusive")
    if 'provider' in a['usage_sources'] + b['usage_sources']:
        served = [c.get('actual_model') for report in (baseline, candidate) for w in report['workflows'] for c in w['calls']]
        if None in served or len(set(served)) != 1:
            flags.append('served model identity missing or inconsistent')
    if changes["total_tokens"] is None or -changes["total_tokens"] + 1e-9 < 100 * limits["min_token_savings"]:
        flags.append("insufficient total token savings")
    if changes["estimated_cost_usd"] is not None and changes["estimated_cost_usd"] > 0:
        flags.append("estimated cost increased")
    cache_flags = [f for f in flags if 'cache' in f]
    quality_flags = [f for f in flags if any(word in f for word in ('success', 'fallback', 'regressed', 'baseline'))]
    accounting_flags = [f for f in flags if 'accounting' in f or 'identity' in f]
    token_flags = [f for f in flags if 'token savings' in f]
    return dict(accepted=not flags, flags=sorted(set(flags)), changes_percent=changes,
                gates=dict(quality=not quality_flags, accounting=not accounting_flags,
                           token_savings=not token_flags, cache_comparable=not cache_flags),
                token_reduction_qualified=(a['usage_sources'] == b['usage_sources'] == ['provider']
                                           and not (quality_flags or accounting_flags or token_flags)),
                strategies=candidate["strategies"], optimization=candidate["config"]["optimization"], acceptance=limits,
                baseline=a, candidate=b, by_cache_trial={p: {"baseline": baseline["by_cache_trial"][p], "candidate": candidate["by_cache_trial"][p]}
                                                        for p in baseline["by_cache_trial"]},
                measurement_label=baseline["measurement_label"])


def render_comparison(result):
    lines = ["# Baseline vs optimized", "", result["measurement_label"], "", "Accepted by configured checks: " + str(result["accepted"]),
              "", "| Metric | Baseline | Optimized | Change % |", "|---|---:|---:|---:|"]
    lines += ["| %s | %s | %s | %s |" % (key, result["baseline"][key], result["candidate"][key], value) for key, value in result["changes_percent"].items()]
    for key in ("initial_success_rate", "fallbacks", "model_calls", "retries"):
        lines.append("| %s | %s | %s | — |" % (key, result["baseline"][key], result["candidate"][key]))
    lines.append("| fallback_rate | %s | %s | — |" % tuple(result[name]["fallbacks"] / result[name]["tasks"] for name in ("baseline", "candidate")))
    lines += ["", "Flags: " + ("; ".join(result["flags"]) or "none"), "", "Negative token/cost/latency changes are reductions. Cache phase totals include retries and fallback."]
    if 'gates' in result:
        lines += ['', 'Gate results: ' + json.dumps(result['gates'], sort_keys=True),
                  'Qualified token reduction: ' + str(result['token_reduction_qualified']),
                  'Cache mismatch does not invalidate provider token counts, but blocks the combined adoption/cost/latency verdict.']
    for phase, values in result["by_cache_trial"].items():
        lines += ["", "## " + phase, "", "```json", json.dumps(values, indent=2), "```"]
    return "\n".join(lines) + "\n"

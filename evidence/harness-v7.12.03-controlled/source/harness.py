#!/usr/bin/env python3
"""Evaluate teaching quality; track usage without rewarding shorter answers."""

import argparse
import json
import math
import os
import re
import statistics
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from common import digest, measure, require, save, token_count
from quality import teaching_checks, validate_rubric


def validate(suite):
    require(isinstance(suite, dict) and set(suite) == {"variants", "cases"},
            "Suite must contain only variants and cases")
    for group, identity, minimum in [("variants", "name", 2), ("cases", "id", 1)]:
        items = suite[group]
        require(isinstance(items, list) and len(items) >= minimum,
                "Need at least %s %s" % (minimum, group))
        seen = set()
        for item in items:
            require(isinstance(item, dict), group + " entries must be objects")
            name = item.get(identity)
            require(isinstance(name, str) and re.fullmatch(r"[\w.-]{1,40}", name),
                    identity + " must be a short identifier")
            require(name not in seen, "Duplicate " + identity + ": " + name)
            seen.add(name)
    for v in suite["variants"]:
        require(set(v) <= {"name", "instructions", "context_key", "max_output_tokens"},
                "Unknown variant field in " + v["name"])
        require(isinstance(v.get("instructions"), str) and v["instructions"].strip(),
                "Each variant needs instructions")
        require(isinstance(v.get("context_key", "full"), str), "context_key must be a string")
        cap = v.get("max_output_tokens", 256)
        require(type(cap) is int and cap >= 16, "max_output_tokens must be an integer >= 16")
    for c in suite["cases"]:
        require({"id", "input", "contexts"} <= set(c)
                and set(c) <= {"id", "input", "contexts", "expected", "rubric", "demo_outputs"},
                "Each case needs id, input, contexts, and expected or rubric")
        require(isinstance(c["input"], str) and c["input"].strip(), "Case input must be nonempty")
        require(("expected" in c) != ("rubric" in c), "Use exactly one of expected or rubric")
        if "expected" in c:
            require(isinstance(c["expected"], str) and c["expected"].strip(), "Expected answer must be nonempty")
        else:
            rubric = c["rubric"]
            require(isinstance(rubric, dict) and "required" in rubric, "Invalid rubric fields")
            if rubric.get('version') == 2:
                validate_rubric(rubric)
            else:
                require(set(rubric) <= {"required", "forbidden", "max_words"}, "Invalid rubric fields")
            require(bool(rubric["required"]), "A rubric needs required checks")
            for kind in ("required", "forbidden"):
                patterns = rubric.get(kind, {})
                require(isinstance(patterns, dict), kind + " must map check names to regex patterns")
                for label, pattern in patterns.items():
                    require(label.strip() and isinstance(pattern, str) and pattern.strip(), "Empty rubric check")
                    try:
                        re.compile(pattern, re.IGNORECASE | re.DOTALL)
                    except re.error as exc:
                        raise ValueError("Invalid pattern for " + label + ": " + str(exc)) from None
            cap = rubric.get("max_words", 300)
            require(type(cap) is int and cap > 0, "max_words must be a positive integer")
        require(isinstance(c["contexts"], dict) and all(isinstance(t, str) for t in c["contexts"].values()),
                "contexts must map names to text")
        for v in suite["variants"]:
            require(v.get("context_key", "full") in c["contexts"],
                    "Missing context for " + c["id"] + "/" + v["name"])
        if "demo_outputs" in c:
            outputs = c["demo_outputs"]
            require(isinstance(outputs, dict) and set(outputs) == {v["name"] for v in suite["variants"]}
                    and all(isinstance(t, str) and t.strip() for t in outputs.values()),
                    "demo_outputs must contain text for every variant")
    return suite


def request_body(variant, case, model):
    # Expected answers, grading rubrics, and demo fixtures never enter requests.
    return {"model": model, "instructions": variant["instructions"],
            "input": "Context:\n" + case["contexts"][variant.get("context_key", "full")]
                     + "\n\nQuestion:\n" + case["input"],
            "max_output_tokens": variant.get("max_output_tokens", 256), "store": False}


def api_post(path, payload, key):
    request = Request("https://api.openai.com/v1/" + path,
                      data=json.dumps(payload).encode("utf-8"),
                      headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"})
    try:
        with urlopen(request, timeout=60) as response:
            return json.load(response)
    except HTTPError as exc:
        # Do not echo response bodies: a server can reflect sensitive request data.
        raise RuntimeError("API HTTP %s; request id: %s" %
                           (exc.code, exc.headers.get("x-request-id", "unavailable"))) from None
    except (URLError, TimeoutError, OSError) as exc:
        raise RuntimeError("API transport failed (%s); no automatic retry" % type(exc).__name__) from None


def demo_post(path, payload, key, answer=None):
    """Offline toy extractor. Counts are fabricated, never benchmark evidence."""
    count = math.ceil(len((payload["instructions"] + payload["input"]).encode("utf-8")) / 4)
    if path.endswith("input_tokens"):
        return {"input_tokens": count}
    if answer is None:
        match = re.search(r"^Owner: (.+)$", payload["input"], re.MULTILINE)
        answer = match.group(1) if match else "UNKNOWN"
    out = math.ceil(len(answer.encode("utf-8")) / 4)
    return {"status": "completed", "model": "synthetic-demo",
            "output": [{"type": "message", "content": [{"type": "output_text", "text": answer}]}],
            "usage": {"input_tokens": count, "output_tokens": out, "total_tokens": count + out,
                      "input_tokens_details": {"cached_tokens": 0},
                      "output_tokens_details": {"reasoning_tokens": 0}}}


def demo_provider(suite):
    fixtures = {(v["instructions"], request_body(v, c, "")["input"]): c["demo_outputs"][v["name"]]
                for c in suite["cases"] if "demo_outputs" in c for v in suite["variants"]}

    def post(path, payload, key):
        answer = fixtures.get((payload["instructions"], payload["input"]))
        return demo_post(path, payload, key, answer)

    return post


def grade(case, output, status="completed"):
    checks = {"completed": status == "completed"}
    if "expected" in case:
        checks["exact_answer"] = output.strip() == case["expected"].strip()
    else:
        rubric = case["rubric"]
        if rubric.get('version') == 2:
            checks.update(teaching_checks(rubric, output))
        else:
            # Legacy coverage checks remain reproducible; v2 adds explicit contracts.
            for kind in ("required", "forbidden"):
                for name, pattern in rubric.get(kind, {}).items():
                    matched = bool(re.search(pattern, output, re.IGNORECASE | re.DOTALL))
                    checks[kind + ":" + name] = matched if kind == "required" else not matched
        if 'max_words' in rubric or rubric.get('version') != 2:
            checks["word_limit"] = len(output.split()) <= rubric.get("max_words", 300)
    result = {"passed": all(checks.values()), "checks": checks,
            "failed_checks": [name for name, passed in checks.items() if not passed],
            "word_count": len(output.split()),
            "grading": "rubric_heuristic" if "rubric" in case else "exact_answer"}
    if case.get('rubric', {}).get('version') == 2:
        result.update(grading='deterministic_contract_v2',
                      critical_failures=[name for name, passed in checks.items() if not passed and name != 'word_limit'])
    return result


def summarize(suite, rows, repeat, min_pass, min_savings, optimize="total", objective="quality"):
    summaries = []
    for v in suite["variants"]:
        subset = [r for r in rows if r["variant"] == v["name"]]
        item = {"variant": v["name"], "runs": len(subset),
                "pass_rate": sum(r["passed"] for r in subset) / len(subset) if subset else 0,
                "case_passes": {c["id"]: sum(r["passed"] for r in subset if r["case"] == c["id"])
                                for c in suite["cases"]},
                "median_latency_ms": statistics.median(r["latency_ms"] for r in subset) if subset else None}
        item["check_passes"] = {c["id"]: {} for c in suite["cases"]}
        for row in subset:
            counts = item["check_passes"][row["case"]]
            for check, passed in row.get("checks", {}).items():
                counts[check] = counts.get(check, 0) + passed
        for field in ("input_tokens", "output_tokens", "total_tokens", "cached_tokens", "reasoning_tokens"):
            values = [r[field] for r in subset]
            item[field] = sum(values) if values and all(n is not None for n in values) else None
        summaries.append(item)
    expected_rows = {(v['name'], c['id'], n) for v in suite['variants'] for c in suite['cases'] for n in range(1, repeat+1)}
    actual_rows = [(r['variant'], r['case'], r['repeat']) for r in rows]
    complete = len(actual_rows) == len(expected_rows) and set(actual_rows) == expected_rows
    baseline = summaries[0]
    strict_contract = any(c.get('rubric', {}).get('version') == 2 for c in suite['cases'])
    baseline_qualified = (baseline['pass_rate'] >= min_pass and not any(
        r.get('critical_failures') for r in rows if r['variant'] == baseline['variant']))
    for item in summaries:
        for metric, field in [("total", "token_savings"), ("input", "input_savings"), ("output", "output_savings")]:
            key = metric + "_tokens"
            item[field] = 1 - item[key] / baseline[key] if complete and baseline[key] else None
        saving = item["output_savings"] if optimize == "output" else item["token_savings"]
        regressions = [c for c, n in item["case_passes"].items() if n < baseline["case_passes"][c]]
        check_regressions = [case + "/" + name for case, checks in baseline["check_passes"].items()
                             for name, n in checks.items() if item["check_passes"][case].get(name, 0) < n]
        item.update(optimization_savings=saving, regressed_cases=regressions,
                    regressed_checks=sorted(check_regressions), eligible=False)
        critical = sum(bool(r.get('critical_failures')) for r in rows if r['variant'] == item['variant'])
        if objective == 'quality':
            item['eligible'] = complete and item['pass_rate'] == 1 and not critical and not check_regressions
            item['decision'] = ('ready for human review' if item['eligible'] else
                                'incomplete run' if not complete else 'teaching checks failed')
        elif item is baseline:
            item["decision"] = "baseline"
        elif not complete:
            item["decision"] = "incomplete run"
        elif strict_contract and not baseline_qualified:
            item['decision'] = 'baseline quality gate failed'
        elif critical or regressions or check_regressions or item["pass_rate"] < min_pass:
            item["decision"] = "quality gate failed"
        elif item["token_savings"] is not None and item["token_savings"] < 0:
            item["decision"] = "total token regression"
        elif saving is None or saving <= 0 or saving + 1e-12 < min_savings:
            item["decision"] = "insufficient savings"
        else:
            item.update(eligible=True, decision="eligible")
    winners = [s for s in summaries if s["eligible"]]
    winner = min(winners, key=lambda s: (s[optimize + "_tokens"], s["total_tokens"]))["variant"] if winners and objective == 'tokens' else None
    return summaries, winner


def validate_teaching_comparison(suite):
    require(all(c.get('rubric', {}).get('version') == 2 for c in suite['cases']),
            'Teaching quality requires version 2 rubrics; use --objective tokens for legacy suites')
    require(len({v.get('context_key', 'full') for v in suite['variants']}) == 1,
            'Teaching variants must use the same reference context')
    require(len({v.get('max_output_tokens', 256) for v in suite['variants']}) == 1,
            'Teaching variants must use the same response budget')


def render_teaching(report):
    lines = ['# Teaching quality evaluation', '', 'Status: ' + report['status'], '',
             'Objective: teaching quality. Tokens and latency are diagnostic only.',
             'Automatic checks do not establish correctness, clarity or learning. No automatic teaching winner.', '',
             ('SYNTHETIC DEMO: handwritten answers and invented token counts.' if report['mode'] != 'live'
              else 'LIVE: provider-reported usage; human and learner evidence still required.'), '',
             '| Variant | Checks passed | Decision | Tokens |', '|---|---:|---|---:|']
    for s in report.get('summary', []):
        lines.append('| %s | %s/%s | %s | %s |' % (
            s['variant'], sum(s['case_passes'].values()), s['runs'], s['decision'], s['total_tokens']))
    if report.get('cache_evidence'):
        cache = report['cache_evidence']
        lines += ['', 'Controlled cache comparison: ' + ('matched' if cache['comparable'] else 'not established'),
                  cache['note'], '', '| Phase | Variant | Checks | Input | Output | Cached input |', '|---|---|---:|---:|---:|---:|']
        for phase, summaries in cache['by_phase'].items():
            for s in summaries:
                lines.append('| %s | %s | %s/%s | %s | %s | %s |' % (phase, s['variant'], s['automatic_passes'],
                             s['calls'], s['input_tokens'], s['output_tokens'], s['cached_tokens']))
        lines += ['- %s / pair %s: %s' % (p['case'], p['repetition'], '; '.join(p['reasons']))
                  for p in cache['pairs'] if not p['comparable']]
    failures = [r for r in report['rows'] if r['failed_checks']]
    lines += ['', '## Checks needing review', '']
    lines += ['- %s / %s / repetition %s: %s' % (r['case'], r['variant'], r['repeat'], ', '.join(r['failed_checks']))
              for r in failures] or ['No deterministic failures. Human review remains pending.']
    if report.get('error'):
        lines += ['', 'Execution error: ' + report['error']]
    lines += ['', 'Next: create a blind pack with teaching_review.py pack, complete human reviews, '
              'then record real unassisted learner responses. Synthetic scores never count as learning evidence.']
    return '\n'.join(lines) + '\n'


def run(suite, args, post):
    started_run = time.perf_counter()
    optimize = getattr(args, "optimize", "total")
    objective = getattr(args, 'objective', 'quality')
    cache_trials = getattr(args, 'cache_trials', False)
    repetitions = args.repeat * (2 if cache_trials else 1)
    if objective == 'quality':
        validate_teaching_comparison(suite)
    report = {"mode": "synthetic_demo" if args.demo else "live", "model": args.model,
              "optimize": optimize, "human_review_required": any("rubric" in c for c in suite["cases"]),
              "repeat": repetitions, "min_pass_rate": args.min_pass_rate,
              "min_savings": args.min_savings, "token_budget": args.token_budget,
              "suite": suite, "preflight": [], "rows": [], "status": "preflight", "winner": None}
    if cache_trials:
        require(getattr(args, 'adapter', None) == 'ollama' and not args.demo and objective == 'quality',
                'Controlled cache trials require live Ollama and the quality objective')
        report.update(cache_trials=True, cache_repetitions=args.repeat,
                      cache_protocol='Verified model unload, cold generation, immediate identical warm attempt; both calls counted')
    if getattr(args, 'temperature', None) is not None:
        report['temperature'] = args.temperature
    if objective == 'quality':
        report.update(objective='quality', selection_basis='Human teaching quality and observed learner transfer; no token ranking',
                      evaluation_hash=evaluation_hash(suite), quality_status='not_evaluated')
    save(args.out, report)
    ollama = getattr(args, 'adapter', 'openai') == 'ollama' and not args.demo
    if ollama:
        report.update(adapter='ollama-local-v1', context_tokens=args.context_tokens,
                      preflight_note='Conservative rendered-byte estimates; generation usage is reported by Ollama')
    if not args.demo:
        report['evaluation_hash'] = evaluation_hash(suite)
        report['acceptance_note'] = 'Automatic eligibility is provisional. Teaching deployment requires separate human review; learner outcomes are not inferred.'
    key = "" if args.demo or ollama else os.environ["OPENAI_API_KEY"]
    try:
        jobs = []
        for case in suite["cases"]:
            for variant in suite["variants"]:
                payload = request_body(variant, case, args.model)
                if getattr(args, 'temperature', None) is not None:
                    payload['temperature'] = args.temperature
                count_payload = {k: payload[k] for k in ("model", "instructions", "input")}
                if 'temperature' in payload:
                    count_payload['temperature'] = payload['temperature']
                counted = post("responses/input_tokens", count_payload, key)
                count = token_count(counted.get("input_tokens"))
                jobs.append((variant, case, payload, count))
                report["preflight"].append({"variant": variant["name"], "case": case["id"],
                                            "input_tokens": count, "max_output_tokens": payload["max_output_tokens"]})
                if ollama:
                    report['preflight'][-1].update(count_source=counted.get('count_source'), model=counted.get('model'))
                    require(count + payload['max_output_tokens'] <= args.context_tokens,
                            'Ollama context budget exceeded during preflight; no generation started')
        upper = sum(count + payload["max_output_tokens"] for _, _, payload, count in jobs) * repetitions
        report["planned_max_tokens"] = upper
        require(upper <= args.token_budget,
                "Preflight needs up to %s tokens; budget is %s. No generation started." % (upper, args.token_budget))
        if args.plan:
            report["status"] = "planned"
            return report
        report["status"] = "running"
        save(args.out, report)
        # ponytail: serial requests; add concurrency only if benchmark duration becomes a problem.
        for repetition in range(args.repeat):
            for start in range(0, len(jobs), len(suite["variants"])):
                group = jobs[start:start + len(suite["variants"])]
                offset = (repetition + start // len(group)) % len(group)
                for variant, case, payload, count in group[offset:] + group[:offset]:
                    print("%s / %s / repeat %s" % (variant["name"], case["id"], repetition + 1), file=sys.stderr)
                    reset = post('harness/cache_reset', {'model': args.model}, key) if cache_trials else None
                    for phase_index, phase in enumerate(('cold', 'warm_attempt') if cache_trials else ('natural',)):
                        if cache_trials:
                            require(reset.get('verified_unloaded') is True, 'Cold cache reset was not verified')
                        started = time.perf_counter()
                        response = post("responses", payload, key)
                        row = measure(response)
                        row.update(variant=variant["name"], case=case["id"],
                                   repeat=repetition * 2 + phase_index + 1 if cache_trials else repetition + 1,
                                   latency_ms=round((time.perf_counter() - started) * 1000, 2))
                        if cache_trials:
                            row.update(cache_trial=phase, cache_repetition=repetition+1, request_hash=digest(payload),
                                       cache_reset=reset if phase_index == 0 else None,
                                       provider_duration_ns=response.get('provider_duration_ns', {}))
                        row.update(grade(case, row["output"], row["status"]))
                        report["rows"].append(row)
                        save(args.out, report)
                        require(row["input_tokens"] <= count and row["output_tokens"] <= payload["max_output_tokens"],
                                "Usage exceeded the preflight reservation; stopped remaining requests")
        report["status"] = "completed"
    except (ValueError, RuntimeError, KeyError, TypeError, AttributeError, OSError, KeyboardInterrupt) as exc:
        report["status"] = "error"
        report["error"] = str(exc) or type(exc).__name__
    finally:
        report["summary"], winner = summarize(suite, report["rows"], repetitions, args.min_pass_rate, args.min_savings, optimize, objective)
        report["winner"] = winner if report["status"] == "completed" else None
        if report["status"] != "completed":
            for item in report["summary"]:
                item.update(eligible=False, token_savings=None, input_savings=None,
                            output_savings=None, optimization_savings=None, decision="not evaluated")
        if cache_trials:
            from teaching_cache import cache_evidence
            report['wall_time_ms'] = round((time.perf_counter()-started_run)*1000, 2)
            report['cache_evidence'] = cache_evidence(report)
        save(args.out, report)
        if objective == 'quality':
            report['quality_status'] = ('not_evaluated' if report['status'] == 'planned' else
                                       'human_review_pending' if report['status'] == 'completed'
                                        and any(s['eligible'] for s in report['summary']) else 'checks_failed_or_incomplete')
            save(args.out, report)
            args.out.with_suffix('.md').write_text(render_teaching(report), encoding='utf-8')
    return report


def evaluation_hash(suite):
    root = Path(__file__).resolve().parent
    return digest([suite, (root/'harness.py').read_text(), (root/'quality.py').read_text()])


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("suite", type=Path, nargs='?', help='Defaults to the teaching quality evaluation suite')
    parser.add_argument('--objective', choices=['quality', 'tokens'], default='quality',
                        help='Teaching quality by default; tokens preserves historical experiments')
    parser.add_argument("--model", help="Required for live runs; use a model available to your account")
    parser.add_argument("--adapter", choices=['openai', 'ollama'], default='openai', help='Live provider; --demo remains offline')
    parser.add_argument("--context-tokens", type=int, default=32768, help='Local Ollama context ceiling')
    parser.add_argument('--cache-trials', action='store_true', help='Live Ollama: unload, then run cold and identical warm attempts for each lesson')
    parser.add_argument('--temperature', type=float, help='Optional sampling temperature shared by every variant')
    parser.add_argument("--demo", action="store_true", help="Offline fixtures/toy extractor with SYNTHETIC counts")
    parser.add_argument("--plan", action="store_true", help="Count inputs and check budget, without generation")
    parser.add_argument("--repeat", type=int, default=1)
    parser.add_argument("--token-budget", type=int, default=100000, help="Safety ceiling, not a teaching-quality score")
    parser.add_argument("--min-pass-rate", type=float, default=1.0)
    parser.add_argument("--optimize", choices=["total", "output"], default="total", help="Legacy --objective tokens metric; no quality ranking effect")
    parser.add_argument("--min-savings", type=float, default=0.1, help="Legacy --objective tokens threshold; ignored for teaching quality")
    parser.add_argument("--out", type=Path, required=True, help="New JSON report path; existing files are never overwritten")
    parser.add_argument("--hard-timeout", type=float, help="Terminate the local HTTP worker after this many seconds per request")
    args = parser.parse_args(argv)
    try:
        require(args.repeat > 0 and args.token_budget > 0, "repeat and token-budget must be positive")
        require(args.hard_timeout is None or math.isfinite(args.hard_timeout) and args.hard_timeout > 0, "Invalid hard timeout")
        require(0 < args.min_pass_rate <= 1 and 0 <= args.min_savings <= 1, "Invalid quality/savings thresholds")
        require(args.objective != 'quality' or args.min_pass_rate == 1,
                'Teaching quality requires all deterministic checks; pass thresholds cannot waive errors')
        require(not args.demo or not args.model, "Do not combine --demo with --model")
        require(not args.demo or args.adapter == 'openai', 'Do not combine --demo with --adapter ollama')
        require(args.context_tokens > 0, 'context-tokens must be positive')
        require(args.temperature is None or math.isfinite(args.temperature) and args.temperature >= 0, 'Invalid temperature')
        require(not args.cache_trials or (args.adapter == 'ollama' and not args.demo and args.objective == 'quality'),
                '--cache-trials requires live Ollama and the quality objective')
        require(args.demo or bool(args.model and args.model.strip()), "Live runs require --model")
        require(args.demo or args.adapter == 'ollama' or bool(os.environ.get("OPENAI_API_KEY")),
                "Set OPENAI_API_KEY, use --adapter ollama, or use --demo")
        if args.suite is None:
            args.suite = Path(__file__).with_name('teaching-quality-demo.json' if args.demo else 'teaching-quality-eval.json')
        suite = validate(json.loads(args.suite.read_text(encoding="utf-8")))
        if args.objective == 'quality':
            validate_teaching_comparison(suite)
            require(args.out.suffix == '.json' and not args.out.with_suffix('.md').exists(),
                    'Use a new .json output path and an unused matching .md path')
            require(not args.demo or all('demo_outputs' in c for c in suite['cases']),
                    'Quality demos require handwritten fixtures; omit the suite argument for the runnable demo')
        args.model = "synthetic-demo" if args.demo else args.model
        args.out.parent.mkdir(parents=True, exist_ok=True)
        with args.out.open("x", encoding="utf-8") as handle:
            handle.write("{}\n")
    except (ValueError, OSError) as exc:
        parser.error(str(exc))
    if args.adapter == 'ollama' and not args.demo:
        from isolation import IsolatedAdapter
        from ollama_adapter import OllamaAdapter
        with IsolatedAdapter(OllamaAdapter(args.context_tokens)) as isolated:
            isolated.timeout_seconds = args.hard_timeout or 120
            report = run(suite, args, lambda path, payload, key: isolated.call('post', (path, payload, key)))
    elif args.hard_timeout is not None and not args.demo:
        from isolation import IsolatedAdapter
        from model_adapters import TeachingHTTPAdapter
        with IsolatedAdapter(TeachingHTTPAdapter()) as isolated:
            isolated.timeout_seconds = args.hard_timeout
            report = run(suite, args, lambda path, payload, key: isolated.call("post", (path, payload, key)))
    else:
        report = run(suite, args, demo_provider(suite) if args.demo else api_post)
    print("SYNTHETIC DEMO — not measured model savings" if args.demo else "LIVE — provider-reported token usage")
    if report.get("planned_max_tokens") is not None:
        print("Preflight maximum: %s / %s tokens" % (report["planned_max_tokens"], args.token_budget))
    if args.plan:
        for entry in report["preflight"]:
            print("%s / %s: %s input tokens, output cap %s" %
                  (entry["variant"], entry["case"], entry["input_tokens"], entry["max_output_tokens"]))
    for s in report["summary"] if report["rows"] else []:
        if args.objective == 'quality':
            print('%-20s checks=%5.1f%% %s | tokens=%s (diagnostic)' %
                  (s['variant'], s['pass_rate'] * 100, s['decision'], s['total_tokens']))
            continue
        savings = "n/a" if s["optimization_savings"] is None else "%.1f%%" % (s["optimization_savings"] * 100)
        print("%-20s pass=%5.1f%% input=%-6s output=%-6s %s saved=%-7s %s" %
              (s["variant"], s["pass_rate"] * 100, s["input_tokens"], s["output_tokens"], args.optimize, savings, s["decision"]))
    print("Status: %s | Selected: %s | Report: %s" % (report["status"], report["winner"] or "none", args.out))
    if report["human_review_required"]:
        print("Teaching selections are provisional: regex checks cannot verify correctness, clarity, or learning.")
    if report.get("error"):
        print(report["error"], file=sys.stderr)
    if report["status"] == "error":
        return 2
    if args.objective == 'quality':
        return 0 if report['status'] == 'planned' or any(s['eligible'] for s in report['summary']) else 1
    return 0 if report["status"] == "planned" or report["winner"] else 1


if __name__ == "__main__":
    sys.exit(main())

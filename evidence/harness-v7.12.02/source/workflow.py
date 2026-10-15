#!/usr/bin/env python3
"""Small reproducible workflow benchmark: baseline, evaluate, compare, detail."""

import argparse
import copy
import hashlib
import json
import sys
import time
import uuid
from pathlib import Path

from common import append_json, digest, encoded, estimate, positive, read_journal, require, save, token_count, validate_usage
from context import (STRATEGIES, SYSTEM, DEVELOPER, TOOLS, check, prepare, read_detail,
                     sources_for, validate, words)
from model_adapters import ModelError, MockAdapter, OpenAIAdapter, validate_response
from ollama_adapter import OllamaAdapter
from isolation import IsolatedAdapter
from reporting import compare, cost, render_comparison, render_run, totals
from quality import json_answer

ROOT = Path(__file__).resolve().parent
IMPLEMENTATION_FILES = ("workflow.py", "model_adapters.py", "ollama_adapter.py", "harness.py", "common.py", "context.py", "quality.py", "reporting.py", "isolation.py")


def implementation_hash():
    return hashlib.sha256(b"".join((ROOT / name).read_bytes() for name in IMPLEMENTATION_FILES)).hexdigest()


class ExecutionLimit(RuntimeError):
    """A shared execution limit that baseline fallback must not bypass."""


def enforce_deadline(config, ledger, adapter):
    remaining = ledger["deadline"] - time.monotonic()
    if remaining <= 0:
        raise ExecutionLimit("Workflow timeout reached")
    adapter.timeout_seconds = min(config["limits"].get("request_timeout_seconds", 60), remaining)
    return remaining


def reserve_tools(config, ledger, count):
    if ledger["tool_calls"] + count > config["limits"].get("tool_calls", 32):
        raise ExecutionLimit("Workflow tool-call limit reached")
    ledger["tool_calls"] += count


def model_call(adapter, request, config, context_limit, ledger, stage, record, purpose="task", on_call=None):
    enforce_deadline(config, ledger, adapter)
    started = time.perf_counter()
    try:
        count = adapter.count(request)
        require(isinstance(count, dict) and isinstance(count.get("source"), str), "Invalid input count envelope")
        token_count(count["tokens"])
    except (ModelError, ValueError, TypeError, KeyError, AttributeError, OSError) as exc:
        record["events"].append(dict(kind="input_count", error=str(exc), latency_ms=(time.perf_counter() - started) * 1000))
        if isinstance(exc, ModelError):
            raise
        raise ModelError("Invalid input count: " + type(exc).__name__) from None
    record["events"].append(dict(kind="input_count", **count, model_tokens=0,
                                  latency_ms=(time.perf_counter() - started) * 1000))
    reservation = count["tokens"] + request["max_output_tokens"]
    require(reservation <= context_limit, "Context budget exceeded; essential context was not truncated")
    for attempt in range(config["limits"]["retries"] + 1):
        enforce_deadline(config, ledger, adapter)
        require(ledger["reserved_or_used"] + reservation <= config["limits"]["workflow_tokens"], "Workflow budget exhausted")
        row = dict(call_index=len(record["calls"]), stage=stage, purpose=purpose, attempt=attempt, retry=attempt > 0,
                   preflight=count, response_budget=request["max_output_tokens"], request_hash=digest(request),
                   request=copy.deepcopy(request),
                   tool_result_tokens_estimate=sum(estimate(m["output"]) for m in request["input"] if m.get("type") == "function_call_output"),
                   tool_attribution="byte estimate; already INCLUDED in input tokens, never additive")
        if on_call:
            on_call("call_started", row)
        started = time.perf_counter()
        result, error, observed_usage = None, None, None
        try:
            result = adapter.generate(request)
            observed_usage = validate_usage(result["usage"])
            validate_response(result)
            row.update(usage=result["usage"], call_success=result["status"] == "completed", status=result["status"],
                       actual_model=result.get("model"), response_id=result.get("response_id"),
                       response=copy.deepcopy(result))
        except (ModelError, ValueError, TypeError, KeyError, AttributeError, OSError) as exc:
            error = exc if isinstance(exc, ModelError) else ModelError("Invalid adapter response: " + type(exc).__name__, usage=observed_usage)
            try:
                validate_usage(error.usage)
            except (ValueError, TypeError, KeyError):
                error = ModelError("Invalid adapter error usage")
            row.update(usage=error.usage, call_success=False, status="error", error=str(error))
        row["latency_ms"] = (time.perf_counter() - started) * 1000
        row["estimated_cost_usd"] = cost(row["usage"], config["pricing"])
        row["cache_observed"] = ("unknown" if row["usage"] is None or row["usage"]["cached_tokens"] is None
                                 else "warm" if row["usage"]["cached_tokens"] > 0 else "cold")
        record["calls"].append(row)
        # Ambiguous failures and heuristic live usage retain the full reservation.
        counts = row["usage"]
        charged = counts["total_tokens"] if counts is not None else reservation
        if counts is not None and counts["source"] == "estimated":
            charged = max(charged, reservation)
        ledger["reserved_or_used"] += charged
        if on_call:
            on_call("call_finished", {k: v for k, v in row.items() if k != "request"})
        # Keep any returned usage before checking a deadline crossed during I/O.
        enforce_deadline(config, ledger, adapter)
        if counts is not None and counts["source"] in ("provider", "synthetic_estimate"):
            if counts["input_tokens"] > count["tokens"] or counts["output_tokens"] > request["max_output_tokens"]:
                raise ModelError("Provider exceeded token reservation; stopped without fallback")
        if error is None:
            return result
        if not error.retryable or attempt == config["limits"]["retries"]:
            raise error
        delay = min(0.1 * 2 ** attempt, 2)
        if delay >= enforce_deadline(config, ledger, adapter):
            raise ExecutionLimit("Workflow timeout leaves no time for retry backoff")
        record["events"].append(dict(kind="retry_backoff", seconds=delay, model_tokens=0))
        time.sleep(delay)


def execute(task, config, strategies, adapter, cache_scope, on_call=None):
    if config["limits"].get("isolate_adapter", False) and not isinstance(adapter, IsolatedAdapter):
        with IsolatedAdapter(adapter) as isolated:
            return execute(task, config, strategies, isolated, cache_scope, on_call)
    started = time.perf_counter()
    record = dict(task_id=task["id"], category=task["category"], calls=[], events=[], attempts=[],
                  initial_success=False, success=False, fallback=False)
    ledger = {"reserved_or_used": 0, "tool_calls": 0,
              "deadline": time.monotonic() + config["limits"].get("workflow_timeout_seconds", 300)}
    for stage, active in [("optimized" if strategies else "baseline", strategies)] + ([("fallback", [])] if strategies else []):
        attempt = dict(stage=stage, success=False, output="")
        if stage == "fallback":
            record["fallback"] = True
        try:
            enforce_deadline(config, ledger, adapter)
            reserve_tools(config, ledger, 1)  # Initial local load_context, including each fallback.
            messages, context, event = prepare(task, active, config)
            record["events"].append({**event, "stage": stage})
            settings = copy.deepcopy(config["model"])
            settings["model"] = settings.pop("name")
            context_limit = config["limits"]["context_tokens"]
            if "budgets" in active:
                context_limit = min(context_limit, config["optimization"]["context_tokens"])
                settings["max_output_tokens"] = min(settings["max_output_tokens"], config["optimization"]["response_tokens"])
            for turn in range(config["limits"]["tool_rounds"] + 1):
                request = {**settings, "input": messages, "tools": TOOLS,
                           "prompt_cache_key": cache_scope + ":" + stage}
                if stage == 'fallback' and turn == 0:
                    previous = [c for c in record['calls'] if c['stage'] == 'optimized']
                    effective = lambda r: {k: v for k, v in r.items() if k != 'prompt_cache_key'}
                    direct_answer = (len(previous) == 1 and not any(
                        item.get('type') == 'function_call' for item in previous[0].get('response', {}).get('items', [])))
                    if direct_answer and effective(previous[0]['request']) == effective(request):
                        # Replaying the same failed workflow cannot restore omitted context.
                        record['fallback'] = False
                        attempt['reason'] = 'Identical baseline request; redundant fallback skipped'
                        record['events'].append(dict(kind='fallback_skipped', reason=attempt['reason'], model_tokens=0))
                        break
                response = model_call(adapter, request, config, context_limit, ledger, stage, record, on_call=on_call)
                if response["status"] != "completed":
                    attempt["reason"] = "incomplete or failed response"
                    break
                tool_calls = [item for item in response["items"] if item.get("type") == "function_call"]
                if not tool_calls:
                    attempt["output"] = response["text"]
                    evaluated = time.perf_counter()
                    attempt["success"], attempt["reason"] = check(task, response["text"])
                    if attempt['success']:
                        value, normalization = json_answer(response['text'])
                        if normalization:
                            attempt.update(normalized_output=encoded(value), normalization=normalization)
                            record['events'].append(dict(kind='format_normalization', normalization=normalization, model_tokens=0))
                    record["events"].append(dict(kind="deterministic_evaluation", model_tokens=0,
                                                  latency_ms=(time.perf_counter() - evaluated) * 1000))
                    break
                require(turn < config["limits"]["tool_rounds"], "Tool round limit reached")
                # Reject an oversized batch before running any part of it.
                reserve_tools(config, ledger, len(tool_calls))
                messages.extend(response["items"])
                for call in tool_calls:
                    enforce_deadline(config, ledger, adapter)
                    tool_started = time.perf_counter()
                    arguments = json.loads(call["arguments"])
                    if call["name"] == "load_context":
                        require(arguments == {}, "load_context takes no arguments")
                        output = context
                    else:
                        require(call["name"] == "read_detail", "Unsupported tool")
                        reader = adapter.read_detail if isinstance(adapter, IsolatedAdapter) else read_detail
                        try:
                            output = reader(sources_for(task), arguments, config["limits"]["detail_lines"],
                                            config["optimization"].get("source_bytes", 4096), "bounded_sources" in active)
                        except ModelError as exc:
                            record["events"].append(dict(kind="tool", name=call["name"], arguments=arguments,
                                                          status="error", error=str(exc), model_tokens=0,
                                                          latency_ms=(time.perf_counter() - tool_started) * 1000))
                            raise
                    record["events"].append(dict(kind="tool", name=call["name"], arguments=arguments, output=output,
                                                  model_tokens=0, latency_ms=(time.perf_counter() - tool_started) * 1000))
                    messages.append(dict(type="function_call_output", call_id=call["call_id"], output=output))
        except (ValueError, KeyError, TypeError, ModelError, ExecutionLimit) as exc:
            attempt["reason"] = str(exc)
            # Auth/transport failures are not evidence that an optimization failed.
            if isinstance(exc, ModelError):
                attempt["provider_error"] = True
            if isinstance(exc, ExecutionLimit):
                attempt["execution_limit"] = True
        record["attempts"].append(attempt)
        if stage != "fallback":
            record["initial_success"] = attempt["success"]
        record["success"] = attempt["success"]
        if attempt["success"] or attempt.get("provider_error") or attempt.get("execution_limit"):
            break
    record["latency_ms"] = (time.perf_counter() - started) * 1000
    record["budget_used_or_reserved"] = ledger["reserved_or_used"]
    record["tool_calls_reserved"] = ledger["tool_calls"]
    for call in record["calls"]:
        call["task_success"] = next(a["success"] for a in record["attempts"] if a["stage"] == call["stage"])
        call["workflow_success"] = record["success"]
    observations = {c["cache_observed"] for c in record["calls"]}
    record["cache_observed"] = next(iter(observations)) if len(observations) == 1 else "mixed_or_unknown"
    record["summary"] = totals([record])
    if on_call:
        on_call("workflow_finished", dict(success=record["success"], attempts=record["attempts"], summary=record["summary"]))
    return record


def benchmark(config, dataset, strategies, adapter, directory):
    if config["limits"].get("isolate_adapter", False) and not isinstance(adapter, IsolatedAdapter):
        with IsolatedAdapter(adapter) as isolated:
            return benchmark(config, dataset, strategies, isolated, directory)
    directory.mkdir(parents=True, exist_ok=False)
    protocol = dict(system=SYSTEM, developer=DEVELOPER, tools=TOOLS)
    for filename, snapshot in (("tasks.json", dataset), ("config.json", config), ("protocol.json", protocol)):
        save(directory / filename, snapshot)
    save(directory / "sources.json", {task["id"]: sources_for(task) for task in dataset["tasks"]})
    (directory / "calls.jsonl").touch()
    (directory / "workflows.jsonl").touch()
    report = dict(schema=2, adapter=adapter.name, config=copy.deepcopy(config), dataset_hash=digest(dataset), split=dataset["split"],
                  planned_trials=[dict(task_id=task['id'], repetition=n,
                                       cache_trial='cold_attempt' if n == 0 else 'warm_repeat')
                                  for task in dataset['tasks'] for n in range(config['limits']['repetitions'])],
                  protocol_hash=digest(protocol), python_version=sys.version,
                  implementation_hash=implementation_hash(),
                  strategies=strategies, workflows=[], status="running",
                  measurement_label="MOCK: synthetic byte estimates and simulated caching; no measured LLM savings."
                  if isinstance(adapter, MockAdapter) or getattr(adapter, "is_mock", False)
                  else "LIVE: provider usage preferred; estimates and unknown usage explicitly labeled.")
    run_id = uuid.uuid4().hex
    save(directory / "results.json", report)
    checkpoint_every = config["limits"].get("checkpoint_every", 25)
    try:
        for task in dataset["tasks"]:
            for repetition in range(config["limits"]["repetitions"]):
                print("%s / trial %s" % (task["id"], repetition + 1), file=sys.stderr)
                trial = dict(task_id=task["id"], repetition=repetition,
                             cache_trial="cold_attempt" if repetition == 0 else "warm_repeat")

                def journal(kind, details):
                    append_json(directory / "calls.jsonl", dict(kind=kind, **trial, **details))

                result = execute(task, config, strategies, adapter, run_id + ":" + task["id"], on_call=journal)
                result.update(trial)
                append_json(directory / "workflows.jsonl", result)
                report["workflows"].append(result)
                if len(report["workflows"]) % checkpoint_every == 0:
                    save(directory / "progress.json", dict(status="running", completed=len(report["workflows"])))
        report["status"] = "completed"
    except KeyboardInterrupt:
        report["status"] = "interrupted"
        raise
    except Exception:
        report["status"] = "failed"
        raise
    finally:
        report["summary"] = totals(report["workflows"])
        report["by_cache_trial"] = {phase: totals([r for r in report["workflows"] if r["cache_trial"] == phase])
                                     for phase in ("cold_attempt", "warm_repeat")}
        report["by_observed_cache"] = {phase: totals([r for r in report["workflows"] if r["cache_observed"] == phase])
                                        for phase in ("cold", "warm", "unknown", "mixed_or_unknown")}
        save(directory / "results.json", report)
        save(directory / "progress.json", dict(status=report["status"], completed=len(report["workflows"])))
        (directory / "report.md").write_text(render_run(report), encoding="utf-8")
    return report


def recover(directory, destination):
    """Recover completed workflows and expose unreconciled call usage; never resume."""
    report = json.loads((directory / "results.json").read_text())
    report.update(status="recovered", workflows=list(read_journal(directory / "workflows.jsonl")))
    report["summary"] = totals(report["workflows"])
    complete = {(row["task_id"], row["repetition"]) for row in report["workflows"]}
    pending, finished = {}, []
    for event in read_journal(directory / "calls.jsonl"):
        if event["kind"] not in ("call_started", "call_finished"):
            continue
        identity = (event["task_id"], event["repetition"], event["call_index"])
        if event["kind"] == "call_started":
            pending[identity] = {key: event[key] for key in ("task_id", "repetition", "call_index", "request_hash")}
        else:
            pending.pop(identity, None)
            if identity[:2] not in complete:
                finished.append(event)
    report["reconciliation"] = dict(unknown_inflight_calls=list(pending.values()),
                                    completed_calls_outside_workflow_totals=finished,
                                    source_run=str(directory.resolve()))
    destination.mkdir(parents=True, exist_ok=False)
    save(destination / "results.json", report)
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for command in ("baseline", "evaluate"):
        sub = commands.add_parser(command)
        sub.add_argument("--config", type=Path, default=ROOT / "workflow-config.json")
        sub.add_argument("--tasks", type=Path, default=ROOT / "tasks-eval.json")
        sub.add_argument("--adapter", choices=["mock", "openai", "ollama"], default="mock")
        sub.add_argument("--model", help="Override config model; required for live use of the sample config")
        sub.add_argument("--out", type=Path, required=True, help="New output directory")
        if command == "evaluate":
            sub.add_argument("--strategies", default=",".join(STRATEGIES), help="Comma-separated strategies; use one for ablation")
    sub = commands.add_parser("compare")
    sub.add_argument("baseline", type=Path)
    sub.add_argument("candidate", type=Path)
    sub.add_argument("--out", type=Path, required=True)
    sub = commands.add_parser("detail")
    sub.add_argument("sources", type=Path)
    sub.add_argument("--task", required=True)
    sub.add_argument("--ref", required=True)
    sub.add_argument("--query", default="")
    sub.add_argument("--start", type=int, default=0)
    sub.add_argument("--lines", "--limit", type=int, default=20,
                     help="Page size: lines for normal refs; bytes for chunk: refs")
    sub = commands.add_parser("recover")
    sub.add_argument("directory", type=Path)
    sub.add_argument("--out", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "recover":
            result = recover(args.directory, args.out)
            print("Recovered completed workflows:", result["summary"]["tasks"])
            return 0
        if args.command == "detail":
            sources = json.loads(args.sources.read_text())[args.task]
            print(read_detail(sources, dict(ref=args.ref, query=args.query, start=args.start, limit=args.lines), 100))
            return 0
        if args.command == "compare":
            result = compare(json.loads(args.baseline.read_text()), json.loads(args.candidate.read_text()))
            args.out.mkdir(parents=True, exist_ok=False)
            save(args.out / "comparison.json", result)
            (args.out / "report.md").write_text(render_comparison(result))
            print(result["measurement_label"])
            print("Accepted:", result["accepted"], "Flags:", result["flags"])
            return 0 if result["accepted"] else 1
        config, dataset = json.loads(args.config.read_text()), json.loads(args.tasks.read_text())
        if args.model:
            config["model"]["name"] = args.model
        validate(config, dataset)
        strategies = [] if args.command == "baseline" else args.strategies.split(",")
        require(len(set(strategies)) == len(strategies) and all(s in STRATEGIES for s in strategies), "Unknown/duplicate strategy")
        require(args.adapter == "mock" or config["model"]["name"] != "mock-v1", "Use --model for a live run")
        timeout = config["limits"].get("request_timeout_seconds", 60)
        if args.adapter == "mock":
            adapter = MockAdapter()
        elif args.adapter == "ollama":
            require(all(config['pricing'][key] == 0 for key in
                        ('input_per_million', 'cached_input_per_million', 'output_per_million')),
                    "Use zero token pricing for local Ollama; see ollama-config.json")
            adapter = OllamaAdapter(config['limits']['context_tokens'], timeout)
        else:
            adapter = OpenAIAdapter(timeout)
        result = benchmark(config, dataset, strategies, adapter, args.out)
        print(result["measurement_label"])
        print(json.dumps(result["summary"], indent=2))
        return 0 if result["summary"]["success_rate"] == 1 else 1
    except (ValueError, KeyError, TypeError, OSError, ModelError) as exc:
        print("Error:", exc, file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())

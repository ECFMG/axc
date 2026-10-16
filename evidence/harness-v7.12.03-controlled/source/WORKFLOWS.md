# Workflow token optimization harness

Historical token/workflow documentation. The current teaching-quality workflow starts in [README.md](README.md).

**Local Ollama support:** use `--adapter ollama --config ollama-config.json --model YOUR_LOCAL_MODEL`. See [OLLAMA.md](OLLAMA.md) for setup and preservation/accounting limits. `ollama_adapter.py` implements the same replaceable adapter contract used by the existing runners.

See [IMPROVEMENTS.md](IMPROVEMENTS.md) for the latest persistence measurements, bounded-source and cancellation configuration, and fresh teaching evaluation with human-review commands.

This is a dependency-free Python 3.9+ CLI. It runs an unchanged sample baseline, applies independently selected strategies, and compares total workflow cost and success. The original teaching CLI, prompts, fixtures, and tests remain available.

## Repository inspection

This workspace is not a Git checkout. It contains the earlier Python benchmark, not an application repository. `harness.py` already builds single-turn prompts and calls the OpenAI Responses API through `urllib`; it measures usage and supports exact-answer and regex coverage checks. Its context is supplied in JSON. There was no production conversation loop, retrieval component, tool runner, retry policy, cost calculation, or dependency manifest. Thirteen existing tests cover that benchmark.

`workflow.py` runs the sample workflow. `context.py` owns prompts, task validation, and context strategies; `reporting.py` owns cost aggregation and comparisons; `common.py` shares usage validation and atomic JSON writing across both CLIs. `model_adapters.py` supplies mock and OpenAI adapters. Existing public functions remain available from `workflow` and `harness`. No packages, dashboard, database, or hosted service were added. The [refactor and stress report](REFACTOR_AND_STRESS.md) explains the layout and evidence.

## Run the mock benchmark

Run these commands from this directory. Each output directory must be new.

```sh
python3 -B workflow.py baseline --out runs/baseline
python3 -B workflow.py evaluate --out runs/optimized
python3 -B workflow.py compare runs/baseline/results.json runs/optimized/results.json --out runs/comparison
python3 -B -m unittest -v
```

The current runnable demo is the [isolated workflow comparison](hardening-results/final-cli/comparison/report.md). Earlier demos remain in `stress-results/`, `workflow-checklist-demo/`, and `workflow-demo/`, including individual strategy comparisons. Each comparison uses matching implementation hashes; do not mix baselines from different versions. See [the nine-component checklist](CHECKLIST.md) for implementation coverage.

**Mock tokens are synthetic byte estimates; caching is simulated.** Its deterministic record reader sees only submitted messages and tool results. It never reads expected answers. It demonstrates execution, preservation, accounting, and fallback; it does not establish real LLM token savings, model quality, or teaching effectiveness. Mock dollar figures use explicitly illustrative rates.

## Baseline and fixed tasks

The sample workflow takes instruction messages, conversation history, document passages, and frozen tool output. It loads that context once, asks for a JSON lesson record, executes any requested detail lookups, and checks the returned JSON. Baseline sends all original history, passages, and tool output with the original model settings. No optimization strategy runs in baseline.

`tasks-tune.json` contains development examples. `tasks-eval.json` contains separate fixed cases for short requests, long conversations, large tool results with useful details beyond the preview, and earlier user constraints plus source references. IDs and requests differ. Do not use evaluation results to revise strategies repeatedly and still describe that set as unseen. Add fresh held-out tasks after tuning. These small authored tasks exercise mechanics; replace them with representative production tasks before drawing quality conclusions.

```sh
# Tune against development cases.
python3 -B workflow.py evaluate --tasks tasks-tune.json --strategies compact_history --out runs/tuning

# Measure one strategy on the evaluation set.
python3 -B workflow.py evaluate --strategies retrieve --out runs/retrieval
python3 -B workflow.py compare runs/baseline/results.json runs/retrieval/results.json --out runs/retrieval-comparison
```

## Strategies and preservation

Enable one strategy or a comma-separated combination through `--strategies`. Evaluation defaults to all six.

| Strategy | Behavior | Preservation rule |
|---|---|---|
| `deduplicate` | Merge identical document text. | Keep every source reference and the required flag. Never deduplicate instruction messages. |
| `retrieve` | Rank passages by lexical overlap with the request and earlier user messages. | Keep required passages. Retain all passages if nothing matches. Omitted passages remain retrievable. |
| `tool_limit` | Show a line-limited tool preview. | Pin `required_lines`; include line numbers and an omission notice. Keep the complete original source. |
| `compact_history` | Replace eligible older assistant messages with extractive state. | Preserve decisions, constraints, unresolved work, and sources verbatim, at the assistant role. Retain all user/system/developer messages and unstructured assistant messages. |
| `budgets` | Apply tighter context and response limits. | Reject over-budget context instead of silently cutting it. A failed optimized attempt may use the original baseline limits, subject to shared safety budgets. |
| `bounded_sources` | Bound catalogs and nonessential previews by bytes; search omitted source handles and page large records. | Keep all original sources, user constraints, required passages, and explicit state. Refuse/fall back if required content cannot fit. |

All strategies work on copies. Roles and order of instruction messages are preserved. The current request is unchanged. Retrieved data is explicitly lower-trust than instructions. Required passages and tool lines must be annotated by the workflow owner; the harness cannot infer every essential fact from arbitrary text.

History compaction is opt-in. An assistant entry must have `compactible: true` and a `state` object with all four keys: `decisions`, `constraints`, `unresolved`, and `sources`. Each contains a list of verbatim strings from the original message. The owner must ensure this state is complete; substring validation cannot prove that. Messages without this explicit contract are kept intact. `keep_recent` protects recent history.

Original sources persist in each run's `sources.json`. Models can use `read_detail(ref, query, start, limit)` to search or page them. You can inspect the same data locally:

```sh
python3 -B workflow.py detail runs/optimized/sources.json \
  --task eval-tool --ref tool:lesson-catalog --query lesson_42_topic
```

`start` is zero-based. The response includes original line numbers and `next_start`. A single enormous line may still exceed context limits; it is not silently cut. Split such records into passages before benchmarking.

## Quality, fallback, and budgets

The sample checker requires an exact JSON key/value match with the task's `expected` object. Expected values are never included in prompts. Existing teaching regex checks remain in the original CLI; the workflow sample does not use a model judge. Teaching reports require human review for meaning, clarity, learner fit, and preserved qualifications. Passing record-extraction tasks alone does not establish teaching quality.

Incomplete responses, deterministic check failures, optimization context limits, or invalid tool actions trigger one unchanged baseline fallback when optimization is enabled. Both attempts share the same workflow token ledger, deadline, and total tool-call limit. Fallback cannot reset these limits, bypass the hard context ceiling, or hide its cost. Provider/transport failures are retried only according to policy, then stop; they do not trigger a redundant baseline attempt. Exhausted time or total tool-call limits stop without another fallback.

`workflow-config.json` separates:

- `model`: shared model name, output cap, and optional supported generation settings.
- `limits`: context ceiling including output reservation, whole-workflow token limit, retries, tool rounds, total tool calls, request/workflow timeouts, detail-page size, and repetitions.
- `optimization`: retrieval count, preview lines, recent-history count, and reduced context/response limits.
- `pricing`: USD per million regular input, cached input, and output tokens, plus a provenance label.
- `acceptance`: minimum success, allowed final and initial success drops, required total token savings, and maximum fallback rate.

Before each generation attempt, input is counted and maximum output is reserved. Every retry and fallback consumes the same ledger. Unknown-charge failures retain their entire reservation. If usage exceeds a provider reservation, remaining work stops. These controls rely on provider counts/caps and are not account billing limits.

`tool_calls` defaults to 32, including the initial local `load_context` for each attempt. A model response containing more tool calls than remain is rejected before any part of that batch executes. `tool_calls_reserved` includes capacity reserved for accepted batches, even if a later error prevents completing a batch. `tool_rounds` separately bounds model/tool exchanges per attempt.

`request_timeout_seconds` defaults to 60 and sets the adapter's HTTP I/O timeout. `workflow_timeout_seconds` defaults to 300 and provides a shared deadline checked between operations. With `limits.isolate_adapter: true`, a persistent worker also enforces a hard local deadline on adapter calls and detail tools, including data transfers. Stuck workers are terminated and cannot issue further calls. Cache state is retained during normal operation. Remote provider work may still incur charges after local cancellation; unknown usage remains reserved. Preparation and file writes stay in the parent and use cooperative checks. `hardened-config.json` enables isolation; the original config leaves it disabled for compatibility.

Comparisons check both final success and initial success before fallback, flag any previously successful task that fails, and apply configured thresholds. A fallback that restores quality can still cause rejection for quality regression, fallback rate, or higher cost.

## Accounting and fair comparison

Every model attempt records input/output/total/cached tokens, usage source, latency, retry index, response status, estimated cost, attempt task success, final workflow success, and stage. Workflows have their own totals, including failed attempts and fallback. Tokens per successful task divides all consumed tokens by successful tasks; failed-task overhead remains in the numerator.

Tool-result text is included in provider input usage each time it is sent, including repeated history. A separate byte-based attribution estimate identifies the tool share; it is **not added again**. Cached input is already part of input tokens, and reasoning is already part of output tokens.

Provider usage takes precedence. Missing response usage gets a labeled heuristic estimate. Requests with lost responses have unknown billed usage: totals become known lower bounds, cost and tokens-per-success are unavailable, and comparisons are inconclusive. Unknown cache counters get no assumed discount. Estimated cost is:

```text
((input - cached) * input_rate + cached * cached_rate + output * output_rate) / 1_000_000
```

This estimates model token charges, not taxes, minimums, service-tier surcharges, or other platform fees. Update rates to match the exact account/model/tier. The supplied rates are examples, not current provider prices.

Retrieval, extractive compaction, and deterministic evaluation are local and consume zero model tokens. Their CPU latency is recorded. Input-count requests are logged separately. There are no hidden evaluator or summarizer calls. If adding an LLM-based strategy, route its calls through `model_call` with the shared ledger and a distinct `purpose`; include them in `record['calls']`.

Comparisons require matching task snapshots, splits, model settings and served model versions, tool protocol, implementation hashes, common safety limits, prices, and trial schedules. Optimization settings may differ as the treatment. Candidate acceptance thresholds are recorded. Source snapshots keep tool conditions fixed. Baseline results can be reused across individual strategies while these conditions match.

The first execution per task is `cold_attempt`; subsequent identical trials are `warm_repeat`. The mock simulates a full cache hit on identical requests. Live calls use a run/task cache key and report observed provider cache counters. Hosted caches cannot be forcibly cleared here, so a first trial is not proof of a cold cache. Results separate requested trial phases and observed cold/warm/mixed/unknown cohorts. Cache mismatches are flagged rather than presented as controlled cost savings. Warm-up work is included, never discarded. The runner is serial; real latency comparisons need repeated, interleaved runs under similar load.

## Live benchmarking

No API key is configured in this workspace, so live runs have not been executed. To run them:

1. Set `OPENAI_API_KEY` and `OPENAI_MODEL` in your environment.
2. Copy `workflow-config.json` to `live-config.json`; replace example prices and label them with their source/date.
3. Use generation settings supported by that model. Remove `temperature` for models that reject it, consistently in both runs.

```sh
python3 -B workflow.py baseline --adapter openai --model "$OPENAI_MODEL" \
  --config live-config.json --out runs/live-baseline
python3 -B workflow.py evaluate --adapter openai --model "$OPENAI_MODEL" \
  --config live-config.json --out runs/live-optimized
python3 -B workflow.py compare runs/live-baseline/results.json \
  runs/live-optimized/results.json --out runs/live-comparison
```

The adapter uses the [Responses API tool protocol](https://developers.openai.com/api/docs/guides/function-calling) and [input-token counting](https://developers.openai.com/api/docs/guides/token-counting). Tool rounds resend the full input history, including returned reasoning items; `store: false` requests encrypted reasoning content for stateless continuation. The HTTP integration is checked with mocks, not live credentials.

## Extend it

Add cases to the development dataset first. A task has `id`, `category`, `request`, `history`, `documents`, `tool_results`, and `expected`. Documents have unique IDs, text, and optional `required`; tool results can pin one-based `required_lines`. History records have IDs, roles, content, and optional compaction metadata. For another task type, replace `check()` with a deterministic checker or existing project tests; keep expectations out of requests.

Add a strategy to `context.py` (`STRATEGIES` and the relevant preparation helper), with preservation tests and an independent run. Do not change baseline rendering. Use a new evaluation set after tuning.

A replaceable adapter implements `count(request)` and `generate(request)` and honors the mutable `timeout_seconds` I/O limit set by the runner. See the two implementations in `model_adapters.py`. `generate` returns items, text, status, model, response ID, and normalized usage with a source label. Raise `ModelError` with any known usage; never retry inside an adapter. You can pass an adapter directly to `benchmark()` or register it in the CLI selection. This keeps orchestration, cost, retries, and fallback in one place.

The runner validates adapter count envelopes, response envelopes, and normalized usage before accounting. Invalid usage becomes unknown and retains the maximum reservation; malformed response content retains valid reported usage. Both stop without baseline fallback. Add adapter-specific token counting and usage normalization tests before making live calls.

Run the repeatable offline stress suite with a new output directory:

```sh
python3 -B -m unittest -v
python3 -B stress_test.py --iterations 1000 --seed 72819 --out runs/stress
```

This checks randomized context, budget boundaries, retry storms, malformed adapters, tool floods, deadlines, large sources, and storage failure. It also measures local preparation and persistence scaling. It never makes live API requests. `compatibility.json` contains frozen pre-refactor fingerprints; do not regenerate it merely to make a failing test pass.

Each run writes:

- `tasks.json`, `config.json`, `protocol.json`, and `sources.json`: complete task, model/pricing/limit, prompt/tool schema, and original source snapshots.
- `results.json`: per-call request/response snapshots, usage, quality, workflow outcomes, strategy selection, hashes, Python version, and aggregate metrics. Request snapshots are copied before later tool rounds modify history.
- `calls.jsonl`: an append-only journal. Match `call_started` and `call_finished` by task ID, repetition, and call index. Finished entries contain returned usage; `workflow_finished` supplies stage quality and the final outcome. An unmatched start means interrupted/in-flight usage is unknown.
- `workflows.jsonl`: each completed workflow appended once, usable for recovery after a stopped process.
- `progress.json`: small progress counters written every `limits.checkpoint_every` workflows (default 25), and at completion/interruption.
- `report.md`: a readable report, including run status and cache cohorts.

Comparison writes `comparison.json` and `report.md`, including percent changes and separate cache-phase totals. These artifacts contain prompt source material and answers; handle them as task data. Authorization headers and API keys are not included. `results.json` is written atomically at startup and completion/interruption; completed workflows and call entries are closed after each append. `workflow.py recover RUN_DIR --out NEW_DIR` reconstructs completed workflows and exposes unreconciled calls, including a partial final append. This is not a resume facility or a guarantee against power-loss data loss. Interrupted and recovered runs are not comparable.

Exit codes: `0` successful tasks or accepted comparison; `1` task failure or rejected comparison; `2` invalid input or execution setup error. A mock comparison accepted by the checks is still only a mock demonstration.

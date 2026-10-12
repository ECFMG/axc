# Refactor and stress-test findings

Historical token/workflow documentation. The current teaching-quality workflow starts in [README.md](README.md).

This records the earlier refactor and its measurements. The recommended follow-up work is now covered in [IMPROVEMENTS.md](IMPROVEMENTS.md), including current tests and remaining live-evaluation requirements.

The harness has been reorganized without changing its normal prompts, commands, settings, result schemas, strategy behavior, or baseline fallback. Stress testing then exposed an adapter-validation defect, which was fixed separately from the structural moves.

Ponytail guided the simplification: plain functions, standard library, and no new dependencies or framework. Caveman guided the evidence review and concise recommendations. The review uses native local test results; no Caveman cloud service or live model benchmark was run.

## Structure

| File | Responsibility |
|---|---|
| `workflow.py` | Workflow execution, shared limits, retries, tools, journaling, and workflow CLI. |
| `context.py` | Task/configuration validation, prompt protocol, document selection, history compaction, tool previews, and detail recovery. |
| `model_adapters.py` | Mock/OpenAI adapters and response-envelope validation. |
| `reporting.py` | Cost calculations, workflow totals, fair comparisons, and Markdown rendering. |
| `common.py` | Shared usage validation, token helpers, serialization, and atomic JSON writes. |
| `harness.py` | Existing single-turn teaching benchmark and CLI. |

The old public functions remain importable from `workflow` and `harness`; adapter helper imports remain compatible. Neither CLI imports the other anymore. Context preparation has separate document, history, and tool helpers. Configuration validation is separated from task validation. Comparison formatting is separated from command dispatch.

The largest production module decreased from 557 to 302 lines. Total production code grew modestly because the new boundaries and validation are explicit; this is a clarity refactor, not a claim of fewer overall lines. Tests, sample tasks, prompts, saved reports, and the original teaching workflow remain present. Implementation hashes now include all six production modules.

## Preservation proof

- All **37 unit tests pass**. The original 32 test cases were retained unchanged.
- `compatibility.json` was captured before editing production code. It records **384 mock workflow fingerprints**: all 32 strategy combinations, all six development/evaluation tasks, and first/repeated cache trials.
- Four complete teaching benchmark reports also match: both task suites under both optimization objectives, each with two repetitions.
- Fingerprints exclude latency fields only. They retain prompt text, message order, requests, responses, usage, cache counts, costs, tool events, decisions, and success/fallback results.
- Six CLI checks pass: workflow baseline, evaluate, compare, detail retrieval, teaching demo, and teaching preflight. See [CLI evidence](stress-results/cli/checks.json).
- The current [mock comparison](stress-results/cli/comparison/report.md) still passes 8/8 trials in both modes, without fallback. Its synthetic token totals remain 25,134 baseline and 8,572 optimized. These are not measured LLM savings.

## Stress coverage and results

Two complete runs passed all nine scenarios, using seeds `72819` and `9173`:

- **2,000 generated cases / 4,000 workflow executions.** Random combinations of strategies, duplicate/shuffled documents, irrelevant passages, older assistant state, later user overrides, Unicode values, and structured values.
- **36 budget boundary cases per seed.** Context and workflow limits immediately below, at, and above reservations, with four output caps.
- **Eight retry scenarios per seed**, including 26 consecutive attempts, with known and unknown usage. Backoff sleeps are mocked; call counts, reservations, and recorded delay events are tested.
- **Eight malformed adapter results per seed:** negative counts, boolean counts, inconsistent totals, impossible cache counts, missing fields, invalid usage source, invalid items, and invalid response text.
- **10,000 requested tool calls in one response.** The entire batch is rejected before any tool executes.
- **Deadline crossings** during counting and generation. No later call starts; returned late usage remains accounted for.
- **100,001-line tool output**, totaling 1,188,910 bytes. The omitted answer is recovered successfully in three model calls. A one-million-character line is refused safely rather than silently truncated.
- **Context preparation** with up to 5,001 documents and 5,001 history messages. User constraints and every source handle remain available.
- **Persistence scaling** at 10, 50, and 100 workflows, plus an injected journal-write failure that stops further calls.

Raw results: [seed 72819](stress-results/final-seed-72819/report.md), [seed 9173](stress-results/final-seed-9173/report.md). Each JSON report saves its seed, configuration, Python version, implementation hash, and stress-script hash.

These are local offline stress tests. They do not measure provider load capacity, real inference latency, semantic teaching quality, or live savings. Memory figures below are peak Python allocations from `tracemalloc`, not process RSS. Timing samples are descriptive; two runs are not a statistical performance study.

## Defect found and fixed

The first stress pass showed that replaceable adapters could return invalid usage counters without rejection. Missing usage fields could lose the call from the ledger; malformed response items could raise an uncaught exception. Invalid content could also trigger an unnecessary baseline attempt.

The execution boundary now validates count envelopes, response envelopes, and normalized usage. Invalid usage becomes unknown, retains the maximum reservation, and stops. Invalid content with valid usage keeps those charges and stops. Neither condition invokes baseline fallback. Invalid usage attached to a retryable error also stops instead of repeatedly trusting corrupt counters.

Four new regression tests cover these cases. The [first-pass report](stress-results/first-pass/report.md) retains the original failures. Its large-context failure was a test assumption: the answer was recovered, but the mock made three calls rather than the expected two. The corrected check verifies success and retrieval of the omitted detail instead of assuming a call count.

## Improvements, in priority order

### 1. Measure real teaching quality and cost

The current workflow checker verifies record extraction, and the teaching demo replays authored answers. Neither proves that shorter model explanations teach effectively. Before selecting a production optimization, run a fixed live model on fresh held-out lessons across learner levels. Keep exact checks for facts and required steps, review clarity and qualifications manually, and score learners' transfer answers when measuring learning.

Use the existing live adapter and configurable pricing. Include tool, retry, fallback, and any future evaluator/summarizer calls in the same ledger. Do not promote the synthetic token reduction as a real saving.

### 2. Reduce growing report rewrites

Ten small workflows took about **26–27 ms** overall. One hundred took **1,335–1,343 ms**, while their recorded workflow execution took only **37–38 ms**. Report creation and persistence dominate this local workload.

The runner rewrites the complete, growing `results.json` after every workflow, in addition to its append-only journal. The number of serialized prior records therefore grows quadratically with workflow count. The timings include other serialization and report work too; they do not isolate the exact share of each operation.

The smallest next change is to append each completed workflow once, retain the existing call journal, and write the aggregate report at bounded checkpoints and completion. Preserve interrupted-run recovery and unknown-call accounting. A database is not required.

### 3. Bound source catalogs and split oversized records

With 5,001 documents and 5,001 history messages, the optimized prepared request still occupies **818,773 bytes**. Preparation takes **155–159 ms** and peaks near **6.45 MB** of Python allocations. Required history and the complete source catalog can overwhelm the context ceiling even when document bodies are filtered.

Add a bounded searchable source catalog and stable source IDs, while retaining all user instructions and required state. Add byte/token-aware chunks for large records: the existing line preview cannot reduce a single enormous line. Keep omission notices and detail retrieval. Test that required state remains intact before treating these changes as savings.

### 4. Add hard cancellation only when live usage requires it

Current deadlines are cooperative. They stop subsequent work and shorten HTTP I/O timeouts, but cannot forcibly interrupt arbitrary adapter code or a slowly progressing response. The deadline stress cases verify accounting and control flow with a fake clock; they are not proof of hard cancellation.

If real runs encounter stuck adapters or tools, add a cancellable execution boundary and reconciliation for requests whose billed usage remains unknown. Keep the current synchronous runner until that need is demonstrated.

## Reproduce

Run from the harness directory. Stress output directories must be new.

```sh
python3 -B -m unittest -v
python3 -B stress_test.py --iterations 1000 --seed 72819 --out runs/stress-72819
python3 -B stress_test.py --iterations 1000 --seed 9173 --out runs/stress-9173
```

See [WORKFLOWS.md](WORKFLOWS.md) for baseline/evaluate/compare commands, adapter configuration, live setup, and adding tasks. Preserve the frozen compatibility fixture when extending tests; update it only for an intentional, reviewed behavior change.

# Harness acceptance checklist

Historical token/workflow documentation. The current teaching-quality workflow starts in [README.md](README.md).

All nine components are implemented in the standalone Python harness. The inspected workspace contains no production LLM application to integrate with; the sample workflow assembles lesson records from instructions, history, documents, and tool results.

| Component | Implementation | Evidence and limits |
|---|---|---|
| Model adapter | `model_adapters.py`: replaceable `count` and `generate` methods; mock and OpenAI Responses adapters. | Provider usage takes precedence. HTTP contract tests run offline; live credentials were unavailable. |
| Context manager | `context.py:prepare` assembles role-preserving messages, history, passages, and tool output; the original `workflow.prepare` import remains available. | Preservation tests cover user constraints, state, source references, and unchanged baseline rendering. Owners annotate required context. |
| Optimization strategies | Independently selectable deduplication, lexical retrieval, tool previews with detail recovery, extractive history compaction, and budgets. | Each strategy and their combination pass the fixed mock tasks. No hidden summarizer or evaluator calls. |
| Execution controls | Input/output/workflow token limits, request timeout, workflow deadline, retry limit, tool rounds, total tool-call cap, and one baseline fallback. | Tests cover budget enforcement, late responses, oversized tool batches, and shared limits. Optional worker isolation terminates stuck adapters and detail tools; parent preparation/file writes remain cooperative. |
| Usage ledger | Per-call and workflow usage, cache counters, latency, retries, success, cost, and tool-result attribution. | Retry/fallback overhead is included. Tool tokens are not double-counted. Missing usage remains unknown. |
| Representative benchmarks | Separate development and evaluation JSON datasets; evaluation covers short requests, long history, large tool output, and earlier constraints. | Four evaluation tasks run twice for first/repeat cache trials. Small authored fixtures are not evidence of production quality. |
| Quality checks | Exact JSON matching for workflow tasks; original teaching coverage checks and required human review. | Deterministic failures, prior-task regressions, and initial failures hidden by fallback are flagged. Teaching clarity and learner comprehension require further evaluation. |
| Comparison reports | JSON and Markdown with tokens, tokens per success, estimated cost, latency, initial/final success, fallback frequency, retries, and cache phases. | Comparisons reject mismatched task/model/settings/protocol/implementation conditions. Live cache state cannot be forcibly controlled. |
| Reproducible configuration | Saved model settings, pricing, limits, strategy settings, complete tasks/prompts/sources, implementation hashes, and per-call request/response snapshots. | A call journal preserves completed usage during interruption; unfinished calls remain unknown. Interrupted runs are not comparable. |

## Verification

`python3 -B -m unittest -v` passes **51 tests**, including accounting, preservation, fallback, real worker termination, source pagination, human-review gates, and 384 frozen workflow traces. No new dependencies were added. The [latest report](IMPROVEMENTS.md) covers persistence measurements, stress checks, and remaining live-evaluation requirements.

The current [mock comparison](hardening-results/final-cli/comparison/report.md) passes 8/8 trials in both modes, without fallbacks. Its token counts and cache behavior are synthetic, and its prices are illustrative. No real LLM savings or teaching effectiveness have been measured.

## Commands

Run from this directory with Python 3.9 or later. Choose new output directories.

```sh
python3 -B workflow.py baseline --out runs/baseline
python3 -B workflow.py evaluate --out runs/optimized
python3 -B workflow.py compare runs/baseline/results.json runs/optimized/results.json --out runs/comparison
python3 -B -m unittest -v
```

See [WORKFLOWS.md](WORKFLOWS.md) for live setup, individual strategies, pricing, adapter contracts, and adding tasks. See [README.md](README.md) for the teaching-specific prompt benchmark and its human-review requirements.

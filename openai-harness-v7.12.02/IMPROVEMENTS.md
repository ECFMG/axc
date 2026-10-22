# Teaching evaluation, faster persistence, bounded sources, and cancellation

Historical token/workflow documentation. The current teaching-quality workflow starts in [README.md](README.md).

The four follow-ups now have working local implementations. Real teaching measurement remains pending: no API credentials or live model selection were available, and no human ratings were supplied. The saved teaching run is explicitly a synthetic demonstration.

## What changed

1. **Teaching evaluation:** `teaching-holdout.json` adds six lessons distinct from the earlier teaching examples, covering unit conversion, area scaling, outliers, controlled comparisons, loop boundaries, and multiplication as scaling. Existing prompt variants are unchanged. `teaching_review.py` creates shuffled review forms without variant/model labels, then combines human ratings with deterministic checks, provider token usage, and configurable prices. Missing reviews, failed factual checks, mismatched model/cache conditions, increased cost, or synthetic results block acceptance.
2. **Persistence:** completed workflows append once to `workflows.jsonl`. `progress.json` contains small periodic counters, controlled by `limits.checkpoint_every` (default 25). The full `results.json` is written at startup and completion/interruption, rather than after every workflow. The existing call journal remains. `recover` rebuilds completed workflows and lists unfinished or otherwise unreconciled calls; it never resumes generation or marks recovered data comparable.
3. **Bounded sources:** the independent `bounded_sources` strategy caps source catalogs and nonessential previews using `catalog_entries` and `source_bytes`. Omitted handles can be searched or paged with `read_detail(ref="catalog", ...)`. `chunk:<original-ref>` retrieves UTF-8-safe text fragments. Original sources remain intact. Required passages, user instructions, and preserved state are retained; the runner refuses or falls back when essential content cannot fit.
4. **Hard local cancellation:** `limits.isolate_adapter: true` runs the adapter and detail tools in one persistent worker process. Parent-enforced deadlines terminate stuck workers, including blocked request/response transfers. Cache state survives normal requests. Cancellation stops subsequent worker calls, records unknown generation usage conservatively, and does not trigger baseline fallback. The teaching CLI also supports `--hard-timeout SECONDS` for live HTTP calls.

No new packages, service, database, or dashboard were added. Existing five-strategy behavior still matches the frozen 384 workflow traces and four teaching reports. The new strategy has its own preservation tests.

## Evidence

- **51 unit tests pass.** New checks cover journal recovery, bounded catalogs, complete Unicode reconstruction, one-million-character sources, required-context refusal, human-review gates, and termination of real sleeping worker processes.
- The [final stress run](hardening-results/final-stress/report.md) passes all nine scenarios, including 2,000 randomized workflow executions. Large-scale source catalogs are also checked by paging every original handle back.
- The isolated [baseline/optimized mock comparison](hardening-results/final-cli/comparison/report.md) passes all eight trials in each mode.
- The [teaching demo assessment](hardening-results/final-cli/assessment-demo.json) has **12 pending reviews**, no selected variant, and no real savings claim. Both prompt variants receive the same authored demonstration answers; the demo is not evidence that either teaches better.

### Measured persistence improvement

Three alternating repetitions per version used identical mock tasks, configuration, successful-task counts, and total tokens. The earlier implementation was run from its saved source copy. Timings include snapshots, journaling, checkpoints, and report generation.

| Workflows | Previous median | New median | Local runtime reduction |
|---|---:|---:|---:|
| 10 | 26.19 ms | 10.68 ms | 59.2% |
| 100 | 1,341.72 ms | 80.49 ms | 94.0% |

[Raw measurements and source hashes](hardening-results/persistence-comparison.json). This measures local persistence/runtime improvement, not model latency or token savings. Append records plus the final snapshot use more disk space; writes now grow linearly with workflow count.

At 5,001 documents and 5,001 history messages, the prepared request decreased from 818,773 to 581,666 bytes in the source-scaling fixture. The remaining protected history is still too large for the sample model budget. Catalog bounds do not authorize deleting required history.

## Run the workflow improvements

Run from this directory, using new output paths:

```sh
python3 -B workflow.py baseline --config hardened-config.json --out runs/baseline
python3 -B workflow.py evaluate --config hardened-config.json --out runs/optimized
python3 -B workflow.py compare runs/baseline/results.json runs/optimized/results.json --out runs/comparison
python3 -B -m unittest -v
python3 -B stress_test.py --iterations 1000 --out runs/stress
```

`hardened-config.json` enables isolation and sets 25-workflow progress checkpoints, 20 catalog entries, and 4,096-byte source previews. Keep shared model/pricing/limit settings identical in baseline and optimized runs. `bounded_sources` is included in the default optimization set and can be selected alone with `--strategies bounded_sources`.

Retrieve omitted data or recover a stopped run:

```sh
python3 -B workflow.py detail runs/optimized/sources.json --task eval-tool --ref catalog --query lesson_42_topic
python3 -B workflow.py detail runs/optimized/sources.json --task eval-tool --ref chunk:tool:lesson-catalog --query lesson_42_topic --limit 1000
python3 -B workflow.py recover runs/optimized --out runs/recovered
```

For normal source references, `start` and `limit` count lines. For `catalog`, they count matching source entries, subject to the byte cap. For `chunk:` references, `start`/`next_start` count Unicode characters and `limit` caps payload bytes; headers also fit within the configured byte ceiling. Follow `next_start` to reconstruct complete text. An incomplete final JSONL line is ignored during recovery; malformed complete lines are rejected.

## Run a real teaching evaluation

Configure `OPENAI_API_KEY` locally and set `OPENAI_MODEL` to the selected model. Do not paste credentials into review files. Choose the token budget and repetition count deliberately. Copy `workflow-config.json` to `live-config.json`, replace illustrative pricing with the correct model/account rates, and update its provenance label.

```sh
# Provider input counts and maximum-output reservation; no generation.
python3 -B harness.py teaching-holdout.json --objective tokens --model "$OPENAI_MODEL" --repeat 3 --token-budget 60000 --hard-timeout 60 --plan --out runs/teaching-plan.json

# Live model responses using the frozen prompt variants and lessons.
python3 -B harness.py teaching-holdout.json --objective tokens --model "$OPENAI_MODEL" --repeat 3 --token-budget 60000 --hard-timeout 60 --out runs/teaching-live.json

# Give only this shuffled form to the human reviewer; keep the model report separate.
python3 -B teaching_review.py pack runs/teaching-live.json --out runs/review.json

# Run after the reviewer completes ratings, checks, and reviewer identification.
python3 -B teaching_review.py assess runs/teaching-live.json runs/review.json --pricing live-config.json --out runs/teaching-assessment.json
```

The reviewer scores factual correctness, clarity, and learner fit from 1–5. Every score must be at least 4, and both constraint preservation and withholding the transfer answer must pass. Modified answers, duplicate reviews, and reviews from another run are rejected. Optional transfer scores require an actual learner response; they are reported separately from expert quality ratings. No learner outcome is inferred from a model answer.

`pack` exits 0 when the form is written. `assess` exits 0 only for an accepted live candidate, 1 for pending/rejected results, and 2 for invalid inputs. The original teaching CLI can also exit 1 when generation completes but no candidate meets its savings gate. This is expected for the provided synthetic demonstration; do not lower thresholds merely to produce a winner.

Keep these lessons separate from tuning examples. If the prompts are revised using their results, create another unseen evaluation set. Expert ratings and descriptive transfer scores are useful evidence, but do not establish a causal improvement in learning without an appropriate learner study.

## Remaining limits

Worker termination guarantees local cancellation of isolated operations. It does not cancel work already accepted by a remote provider or guarantee that no charge occurs. Such generation usage remains unknown until reconciled externally. Input preparation and disk writes still run in the parent and use cooperative workflow checks. Custom adapters must be serializable by Python's `spawn` mechanism; isolation owns their mutable state in the worker.

Source search is local substring matching. It is bounded at the output, not a streaming search engine. The original source data and final report still reside in memory. Required context can legitimately exceed the model budget; the harness reports that instead of silently deleting it.

# OpenAI harness v7.12.02 — controlled upgrade

Revision: `quality-controlled-upgrade-r1`. This extends the supplied v7.12.02 without changing its task specification, generation settings, allowed/protected paths, implementation plan, independent verifier, or eight final validation commands. Original release metadata and fixed contracts are retained in `parent-v7.12.02/`.

The goal is accepted work with lower measured consumption. A 30/30 score requires evidence and independent judgment; the harness never assigns it automatically. Harness regression tests are distinct from live Task A success or measured savings. See VALIDATION.json for this release's actual results.

## Updates, in order

1. Runtime readiness: tool and dependency checks plus clean-baseline build and full tests. Failed prerequisites stop before model dispatch; no automatic production or environment repairs. Existing build/test scripts may create ignored development artifacts. Use an isolated local environment.
2. Context: automatically selected source and explicit source-page reads share a 12,000-character excerpt budget. Fixed prompt/specification stay complete. Omitted portions have exact raw-offset retrieval locators. Character bounds and input estimates are not measured tokens.
3. Budget: primary, reviewer and reporting share one persistent ledger and fixed total call/token ceiling. Reserve 60,000 tokens and one call for review within the existing 300,000-token/20-call limits. Failures, retries and rejected responses remain counted. Unknown provider usage blocks further dispatch.
4. Repetition: preserve two-file guarded actions and focused repair checks. Stop three identical invalid actions, repeated unchanged reads/validation or no-op actions. Real source progress resets successful-action tracking. No-op writes do not advance the implementation plan.
5. Review: final passing validation dispatches a fresh reviewer through the same budget. Findings, missing evidence, incomplete packets and stale sources block controlled acceptance. A review packet alone is not review evidence.
6. Reporting: one final ledger updates root and nested usage, cost and evaluation records. Deterministic reporting consumes no model calls; rendering failures leave reporting open and remove partial completion receipts. Recovery includes original final responses and excludes follow-ups. Explicit export copies the generated report without changing the measured checkout.
7. Experiments: at least two paired repetitions, alternating order, frozen inputs/settings/tools, equivalent validation, complete actor accounting, and preserved failed attempts. Report tokens per accepted task, success rate, estimated cost, model latency and end-to-end time separately.

## Use

Prepare a clean checkout at its declared base and branch, with frozen dependencies and required local runtimes installed. Preparation executes the original baseline build and full tests before model work.

```sh
python3 -B run_task_a.py prepare --repo /path/to/clean-checkout \
  --base BASE_COMMIT --branch EXISTING_LOCAL_BRANCH --evidence /path/to/new-evidence
python3 -B run_task_a.py finish --execute --evidence /path/to/new-evidence
python3 -B run_task_a.py export-report --evidence /path/to/new-evidence \
  --destination /path/to/publication/evaluation-run-record.md
```

Export requires an existing external parent directory and rejects symlinks, stale snapshots and destinations inside the measured checkout. Copy into a publication checkout only after the measured trial, under separate explicit authorization.

For native Codex use `prepare --external`, `host-context`, `repair`, and `finish` with original JSONL/turn identifiers. Native host dispatch and injected context are outside this controller; these runs are advisory and ineligible for controller-enforced savings claims. Use a fresh conversation, relevant skills, bounded reads and concise tool outputs. Do not reuse a completed feature as a fresh implementation trial.

Recover an original native task after its final counters exist without revalidating or invoking models:

```sh
python3 -B run_task_a.py recover --evidence /path/to/evidence \
  --codex-log /path/to/original-session.jsonl --turn-id ORIGINAL_TURN_ID
```

Add `--subagent LOG TURN_ID` for each separately measured actor. Cached input is included in input; reasoning output is included in output. Missing details remain null. Controlled adapter runs use their own shared provider ledger; native counters must use native mode.

## Controlled context comparison

```sh
python3 -B coding_benchmark.py --repository /path/to/source --base BASE_COMMIT \
  --work /path/to/fresh-trial-checkouts --out /path/to/new-comparison \
  --store /path/to/existing-pnpm-store --repetitions 2
```

This compares broad and relevant context within the same harness. It does not compare original versus upgraded versions or harness versus no harness. The existing external no-harness/version protocol remains in COMPARE.md and compare_versions.py; patched version labels are now supported. Declare matching model, settings, task, cache, tools and accounting scopes. Historical branch totals are descriptive evidence, not matched trials.

Optional `--rates` takes declared prices with explicit cache-write and long-context treatment (see rates.example.json). Prices are never inferred for local Ollama, and estimated cost is distinct from billing. Unknown latency or cost stays null. The benchmark generates comparison.json and a root evaluation-run-record.md from the same comparison snapshot, including unsuccessful trials.

See RUBRIC_POLICY.json for the predeclared six-category assessment policy. Forecast error does not determine efficiency points. Fixtures explicitly permitted by Task A do not lose architecture credit merely for lacking production persistence. A complete score requires evidence in every category.

## Verification

```sh
HARNESS_TEST_TYPESCRIPT=/absolute/path/to/typescript/lib/typescript.js \
  python3 -B -m unittest discover -v
```

Live provider experiments, if present, are labeled separately from deterministic and mocked controller tests. No passing score, savings percentage, or successful live review is inferred from mocked fixtures.

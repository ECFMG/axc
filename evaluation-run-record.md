# Task A Final Evaluation Run Record — October 20, 2026

This record covers the fresh Task A implementation from AXC `fe47c38`, original Codex turn `01a15a82-26af-7c30-b6cb-7a52c449e651`, and its Cavecrew reviewer. Their final responses are included. This cost-analysis and publication follow-up is excluded from the original task’s measured usage. Costs are estimates, not billed charges.

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Dane Fortun; User-directed Codex run |
| Reviewer | Cavecrew independent source reviewer; rubric assessment by primary assistant |
| Harness | Supplied openai-harness-v7.12.02-updated.zip inspected; native Codex run with frozen independent verifiers |
| Model | gpt-6.1-sol, medium reasoning for both actors, verified from turn context; service tier unavailable |
| License / Plan | Not assessed; billing, subscription allocation and credits unavailable |
| Codebase | ECFMG/axc; original baseline fe47c38d32376c5e8bcd1d67838160064fd5de99 |
| Task Set | A — TS-A-CATALOG-SEARCH |
| Run Type | Fresh isolated implementation, followed by separately authorized branch integration and publication |
| Harness Engineering Used | Ponytail, Caveman, Cavecrew source review, Code Simplification clarity check; independent endpoint and submitted-test/documentation checks |
| Config / Diff Notes | Eight original feature files within allowed paths. No original-task changes to auth, vendored source, dependency versions, lockfile or production settings. Destination history and newer dependency/security changes preserved. |
| Branch / Commit | Published on df-oai-4-a-out; earlier branch content at 8431da1 preserved as parent history. Original turn created no commits. |
| Requirements Completed / Attempted | A1–A11 / A1–A11 |
| Acceptance Criteria Passed / Total | 12 / 12 |
| Tests Passed / Failed | Original run: 45/0 new API cases; full suite 26/26 tasks; independent Hono 29/29 and Azure HTTP 29/29; 9 architecture cases; all eight gate groups pass |
| Static Analysis / Security Findings | Lint, build, typecheck and architecture pass; independent source reviewer reports no issues. No dedicated security scan claimed. |
| Projected Token Estimate | 180,000; assumed a moderate TypeScript endpoint, bounded inspection, repeated context input, focused tests and workspace validation. Substantially underestimated repeated context; separate from measured usage. |
| Input Tokens | 2,906,909 combined: main 2,567,563; reviewer 339,346 |
| Cached Tokens | 2,778,368 combined: main 2,480,384; reviewer 297,984; already included in input |
| Cache Write Tokens | 0 recorded for both actors |
| Output Tokens | 20,674 combined: main 19,501; reviewer 1,173 |
| Reasoning Output Tokens | 3,423 combined: main 3,270; reviewer 153; already included in output |
| Total Tokens or Credits Used | 2,927,583 tokens: main 2,587,064; reviewer 340,519. Original-task accounting complete; no required token counter missing. Credits unavailable. |
| Estimated Cost | USD 0.7416588, approximately USD 0.74, at supplied Standard rates. Main USD 0.6174064; reviewer USD 0.1242524. Not a bill. |
| Elapsed Time | Original main turn: 2026-10-20T18:10:41.463Z through final usage at 18:16:04.008Z (approximately 5m 23s); exact completion event retained in source log |
| Number of Human Interventions / Redirects | 1 source selection: fresh isolated AXC copy at fe47c38 |
| Reviewer Notes | Independent source review: no issues. Rubric is a primary-assistant evidence assessment, not a human or independent rubric audit. |
| Final Rubric Score | **28/30 (93.3%) final operational assessment** after baseline inspection; strict controlled-policy /30 remains incomplete. These are separate assessments. |
| Recommendation | Candidate for Pilot; controlled efficiency claim requires matched repeated trials |

## Usage scope and cost

Cumulative JSONL counters are subtracted once at original turn boundaries. Cached input and reasoning output are subsets, never added twice. Main final counters are recorded at `2026-10-20T18:16:04.008Z`; reviewer final counters at `2026-10-20T18:13:43.425Z`. Both final responses are accounted for. Source log paths, exact turn IDs, starting/ending counters and completeness checks are in the run’s `usage.json`. Later turns are excluded.

At the user-supplied prices, uncached input costs USD 2.00 per million, cached input USD 0.10, writes USD 2.50 and output USD 10.00. Uncached input is 128,541 tokens, cached input 2,778,368, cache writes zero and output 20,674. Cost is `(128541 × 2 + 2778368 × 0.10 + 0 × 2.50 + 20674 × 10) / 1000000 = USD 0.7416588`. The rates also match the base prices checked against [official OpenAI pricing](https://developers.openai.com/api/docs/pricing) on October 20, 2026.

The supplied long-context condition applies above 272K input tokens per request. Main maximum is 108,832 over 31 requests; reviewer maximum is 63,170 over 6 requests. No original-task request crosses that threshold. Actual service tier, billed charges and subscription allocation are unknown; this is an API-equivalent estimate using the supplied Standard scenario.

## Final rubric

**Final operational score: 28/30 (93.3%).** Six equally weighted five-point categories, using disclosed post hoc anchors in `operational-rubric-policy.json`. Independent Cavecrew review informs source quality; the primary assistant assigns this operational assessment. The supplied controlled-experiment policy remains unchanged and separately incomplete.

| Category | Score / 5 | Evidence |
| --- | ---: | --- |
| Functional correctness | 5 | All fixed acceptance criteria pass; 29 independent checks pass through each transport. |
| Tests and validation | 5 | All eight final gate groups pass; 45 new tests execute without skips. Full-suite rerun has 23/26 cached tasks; independent and submitted checks execute. |
| Architecture and codebase alignment | 5 | Existing composition and public contracts preserved; scoped fixture read model; reviewer reports no issues. |
| Security and guardrail compliance | 5 | Raw validation exercised; allowed/protected boundaries preserved; no dedicated security scan claimed. |
| Context/token/cost efficiency | 3 | Complete direct baseline verified: candidate is 14.87% faster on completed-turn wall time, but uses 27.08% more tokens and costs 14.27% more. Mixed operational outcomes; no controlled savings claim. |
| Developer workflow fit | 5 | Runnable source, applicable patch, API docs, validation, model settings, complete final-response usage, reviewer evidence and limitations supplied. |
| **Final operational total** | **28/30** | **93.3%. Strict controlled-policy result remains incomplete: 25/25 assessed, efficiency unscored.** |


## Verified historical baselines and elapsed time

The following pushed branches were fetched and pinned. Original local JSONL logs were inspected to verify the complete baseline counters and recover the missing final response for the incremental baseline. No baseline branch was modified or revalidated.

| Run | Pinned branch commit | Complete tokens | Estimated USD at same rates | Complete original-turn elapsed |
| --- | --- | ---: | ---: | --- |
| [df-oai-0-out direct baseline](https://github.com/ECFMG/axc/blob/bef3cd20d3a4bc60348a53dd9800c9fdf6f8b94e/evaluation-run-record.md) | bef3cd2 | 2,303,819 | 0.6490460 | 6m 18.875s |
| [df-oai-0-a-out incremental baseline](https://github.com/ECFMG/axc/blob/8e325498aa3b617c208f0cb5c8e564af2331c1b1/evaluation-run-record.md), final counters now recovered | 8e32549 | 2,287,268 | 0.4649696 | 5m 58.877s |
| October 20 candidate, including reviewer | original task 01a15a82 | 2,927,583 | 0.7416588 | 5m 22.550s |

The direct baseline is selected because it starts from matching clean `fe47c38` with the same `gpt-6.1-sol` model and medium reasoning. Current consumption is **27.08% higher in tokens**, **14.27% higher in estimated cost**, and **14.87% lower in elapsed time**. The candidate includes reviewer usage; the baseline has no subagents. This is retrospective descriptive evidence, not a controlled causal harness experiment.

The user’s **5m 11.098s** timing is retained. It exactly matches `df-oai-0-a-out`’s provisional snapshot interval, 13:12:17.483Z–13:17:28.581Z, whose published record excludes final-response usage. Its completed task ends at 13:18:16.360Z, giving **5m 58.877s**. Against the supplied snapshot figure, current elapsed is 11.452 seconds (3.68%) longer; those measurement scopes differ and are not used interchangeably.

The final **28/30 operational assessment** credits mixed efficiency as 3/5. It uses disclosed post hoc anchors. The original strict `RUBRIC_POLICY.json` v1 still requires matched repeated trials; its overall /30 is incomplete, and no controlled 28/30 target attainment or token/cost saving is claimed. Historical baseline grades used different grading criteria and are not directly compared with this score.

[Baseline snapshots, recovered counters and comparison](apps/docs/static/task-a-evaluation/runs/task-a-2026-10-20-01a15a81/baseline-comparison/) · [Final rubric](apps/docs/static/task-a-evaluation/runs/task-a-2026-10-20-01a15a81/final-rubric.md) · [Operational anchors](apps/docs/static/task-a-evaluation/runs/task-a-2026-10-20-01a15a81/operational-rubric-policy.json)

## Publication integration

The destination branch already contained an earlier Task A implementation and evidence. Its existing fixtures, public fixture exports, optional catalog argument, TypeScript tests, dependencies and history are preserved. The follow-up integrates this run’s 45 additional API cases, strict rejection of unknown query parameters and copied result objects/tags to prevent consumers mutating shared fixture state. Both existing and added test files remain registered. Integrated source is revalidated separately; it is not represented as the exact original measured checkout.

The original source snapshot and patch remain unchanged in the run bundle. Original-run logs, final usage/cost, rubric, pricing reference, independent verifiers and publication validation are stored under:

`apps/docs/static/task-a-evaluation/runs/task-a-2026-10-20-01a15a81/`

Earlier evidence is retained at its previous paths and in Git history. No prior-run token totals, estimates or scores are attributed to this run. Initial original-run sandbox failures are retained; reruns with local-server access passed. Full details and limits appear in the run’s `RESULTS.md`, `validation.json`, `cost-estimate.json`, and `final-rubric.json`.

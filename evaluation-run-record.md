# Task A Final Evaluation Run Record

This record covers the original Task A implementation turn, including its final response and fresh reviewer. Later cost analysis, baseline inspection, integration, commits, and publication are excluded from the original task's token counters. All cost figures use the supplied rates and are estimates, not billed charges.

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Codex; operator Dane Fortun |
| Reviewer | Cavecrew reviewer; fresh code review and subsequent evidence/rubric assessment |
| Harness | openai-harness-v7.12.03-low-cost; native Codex advisory workflow |
| Model | gpt-6.1-sol; medium reasoning, verified from original turn context |
| License / Plan | Not independently verified; no subscription fee or credits inferred |
| Codebase | ECFMG/axc; original source base `fe47c38d32376c5e8bcd1d67838160064fd5de99` |
| Task Set | A — TS-A-CATALOG-SEARCH |
| Run Type | Final delivery; prior local Task A implementation reused |
| Harness Engineering Used | Supplied frozen independent Hono/Azure HTTP oracle and submitted-test/documentation gate; Ponytail, Caveman, Cavecrew and Code Simplification guidance |
| Config / Diff Notes | Reused prior implementation `d6153e2`; 13 feature files within allowed paths; improved test registration and documentation. No dependency, authentication, production setting or vendored-source changes by the feature. |
| Branch / Commit | `df-oai-4-a-out`; implementation and evidence commit [`894163a`](https://github.com/ECFMG/axc/commit/894163a8eeef683101b5f2d929e7a2484535af9e). Existing destination changes at `9c890d7` preserved. This record is updated in a subsequent documentation commit. |
| Requirements Completed / Attempted | A1–A11 / A1–A11 |
| Acceptance Criteria Passed / Total | 12 / 12 |
| Tests Passed / Failed | API tests: 46/0; three distinct new service tests pass in the existing Vitest projects; independent Hono: 29/0; independent Azure HTTP: 29/0. All eight final gates pass, including full tests and architecture. |
| Static Analysis / Security Findings | Lint, typecheck and architecture pass; fresh source review: no issues. No dedicated security scan or new full dependency-audit result is claimed. |
| Projected Token Estimate | 1,800,000; range 800,000–3,500,000. Assumed 20–50 calls with 40k–80k input context per call, one endpoint, local validation and optional reviewer. Estimate was exceeded and remains separate from actual usage. |
| Input Tokens | 4,489,800, including primary 4,148,136 and reviewer 341,664 |
| Cached Tokens | 4,322,816; included in input, not added again |
| Output Tokens | 16,759, including 3,179 reasoning tokens; reasoning is not added again |
| Total Tokens or Credits Used | **4,506,559 tokens**, original final response and reviewer included; complete. Credits and actual billed charge unavailable. |
| Estimated Cost | **USD 0.9338396 (about USD 0.93)** at supplied rates; includes reviewer USD 0.1175576 |
| Elapsed Time | Original task start 2026-10-20T17:21:03.884Z; final usage snapshot 2026-10-20T17:27:50.612Z; 406.728 seconds (6m46.728s) to final recorded counters. Publication follow-ups excluded. |
| Number of Human Interventions / Redirects | 0 after the initial original-task request; later publication instructions are separate follow-ups |
| Reviewer Notes | No unresolved source issues. All eight gates passed again on destination branch with its frozen dependencies. Historical baseline comparison below shows higher consumption, without establishing a causal harness effect. |
| Final Rubric Score | **25/25 across five assessed categories; overall /30 incomplete.** Efficiency remains unscored under supplied policy because no controlled matched comparison exists. |
| Recommendation | Candidate for functional pilot; no efficiency improvement demonstrated. Run a controlled paired comparison before assigning efficiency points or claiming savings. |

## Implementation and validation

`GET /api/courses` exposes twelve immutable fixtures with all eight model fields. It supports case-insensitive keyword search across title, summary and tags; modality, status and whole-tag filters; AND combinations; pagination defaults and limits; title/createdAt/updatedAt ascending sorts; consistent 400 responses; and successful empty results. Existing health behavior and authorization-header forwarding are preserved. Catalog remains fixture-backed and read-only, as permitted by Task A.

All eight required final checks pass: full tests, lint, build, typecheck, architecture, independent Hono acceptance, independent Azure HTTP acceptance, and submitted-tests/documentation verification. The checks pass both on the original source base and after integration onto destination commit `9c890d7`. Some unchanged tasks reuse Turbo cache; feature tests and endpoint checks execute after changes. Baseline inspection here does not rerun historical branch tests.

The first sandbox test attempt failed to bind a local MongoDB port. Approved execution outside the sandbox passed. The original offline store lacked a tarball, so validation reused an existing locked installation. Destination validation restored its own frozen lockfile using pnpm 11.11.0. No dependency declarations or lockfiles were changed by this delivery. Source ZIP, patch roundtrip, 159 archive checksums, current validation logs and source review are recorded in the evidence bundle.

## Recorded usage and estimated cost

| Counter | Primary agent | Reviewer | Combined original task |
| --- | ---: | ---: | ---: |
| Input | 4,148,136 | 341,664 | 4,489,800 |
| Cached input (included in input) | 4,019,200 | 303,616 | 4,322,816 |
| Output | 15,649 | 1,110 | 16,759 |
| Reasoning output (included in output) | 3,056 | 123 | 3,179 |
| Total | 4,163,785 | 342,774 | **4,506,559** |

Both actors use cumulative ending-minus-starting counters; snapshots are not summed. Original session `01a15a54-b4ed-7db0-a4ac-7e3baf5afc59`, turn `01a15a54-b785-7d63-abb9-2851199f20a2`. Reviewer session `01a15a58-d36a-77a3-81a8-5a60c7628ada`, turn `01a15a58-d3af-76d3-be76-9a6220b6eaf4`. Exact JSONL source paths and boundaries are retained in [usage.json](apps/docs/static/task-a-evaluation/usage.json). Original final responses are accounted for. No required counter fields are missing at those boundaries.

| Cost component | Tokens | USD per 1M | Estimated USD |
| --- | ---: | ---: | ---: |
| Uncached input | 166,984 | 2.00 | 0.3339680 |
| Cached input | 4,322,816 | 0.10 | 0.4322816 |
| Output, including reasoning | 16,759 | 10.00 | 0.1675900 |
| Cache writes | 0 | 2.50 | 0.0000000 |
| **Total** | **4,506,559** | | **0.9338396** |

Rates come from the user-supplied Standard Mode screenshot. No request exceeds its 272,000-input-token threshold: maximum primary request 121,405, reviewer 59,631. Therefore no doubled input/cache rate applies. Cached input replaces uncached pricing for that subset; reasoning is already in output. This is an estimated token-equivalent cost, not an independently verified current tariff or subscription charge.

## Final rubric

Policy: supplied `RUBRIC_POLICY.json`, version 1, six equal-weight categories with 5 points each. This is a reviewer assessment; no independent audited score is claimed.

| Category | Score / 5 | Evidence |
| --- | ---: | --- |
| Functional correctness | 5 | All fixed acceptance criteria satisfied; independent endpoint checks 29/29 in each mode. |
| Tests and validation | 5 | All eight gates pass; added assertions execute; cache reuse disclosed. |
| Architecture and codebase alignment | 5 | Existing composition, Hono boundary, application factory and public exports preserved; no unresolved review issues. |
| Security and guardrail compliance | 5 | Feature remains within authorized boundaries; raw validation exercised; no protected configuration, authentication or vendor edits. Dedicated security scan not performed. |
| Context/token/cost efficiency | Unscored | Historical comparison exists below; matched repeated trials with frozen workflow inputs and equivalent quality are absent. |
| Developer workflow fit | 5 | Source, patch, complete usage, API docs, current logs, cost estimate, limitations and reviewer evidence available. |
| **Observed subtotal** | **25/25** | **Overall /30 remains incomplete; missing efficiency score is not treated as zero or full credit.** |

## Baseline branches inspected

Both branches contain baseline material. Branch names alone do not define one measurement scope; individual run records are kept separate.

| Branch / record | Recorded tokens | Completeness / suitability |
| --- | ---: | --- |
| [`df-oai-0-out`, pinned `bef3cd2`](https://github.com/ECFMG/axc/blob/bef3cd20d3a4bc60348a53dd9800c9fdf6f8b94e/evaluation-run-record.md) | **2,303,819** | Selected historical baseline: direct Task A implementation from `fe47c38`, same model and medium reasoning; no subagents; original final response included. |
| [`df-oai-0-a-out`, pinned `8e32549`, root record](https://github.com/ECFMG/axc/blob/8e325498aa3b617c208f0cb5c8e564af2331c1b1/evaluation-run-record.md) | 2,099,009 | Later incremental run on existing implementation; root record explicitly says final-response accounting is incomplete. Not selected for a complete-total comparison. |
| `df-oai-0-a-out`, embedded `task-a-2026-10-14-direct-codex/usage.json` | 2,376,618 | Distinct earlier direct implementation; complete. Source log independently checked during this inspection; supporting historical evidence. Same-rate estimateUSD 0.5790616. |
| `df-oai-0-a-out`, embedded `task-a-2026-10-14-01a13c21/usage.json` | 2,303,819 | Same session/turn as selected `df-oai-0-out` baseline; duplicate evidence, not a second trial. |
| `df-oai-0-a-out`, embedded `v7.12-baseline` Ollama run | 255,219 | Different model/provider (`gemma4:26b`); 0/8 Task A validation groups passed. Excluded from accepted-task efficiency comparisons. Coordinating Codex packaging usage is a different scope. |

The selected baseline and distinct older complete baseline were verified against their local source JSONL logs: cumulative subtraction matches committed usage, original final responses are included, and subsequent turns are excluded. Pinned branch records and verification output are preserved in [baseline-comparison](apps/docs/static/task-a-evaluation/baseline-comparison/).

## Historical efficiency comparison

| Metric | Selected historical baseline | Current run, all original-task actors | Observed difference |
| --- | ---: | ---: | ---: |
| Input tokens | 2,286,707 | 4,489,800 | +2,203,093 |
| Cached input, included above | 2,155,520 | 4,322,816 | +2,167,296 |
| Output tokens | 17,112 | 16,759 | −353 |
| Total tokens | 2,303,819 | 4,506,559 | **+2,202,740 (+95.61%)** |
| Estimated USD at same supplied rates | 0.6490460 | 0.9338396 | **+0.2847936 (+43.88%)** |

These totals demonstrate higher recorded consumption in the current run, not savings. Relative reduction is −95.61% for tokens and −43.88% for estimated cost. Primary-only current consumption is 4,163,785 tokens; reviewer adds 342,774 tokens. Baseline has no reviewer; the full current-task total remains the headline figure.

This is a retrospective descriptive comparison, not a controlled causal experiment. Although model, reasoning level and pre-feature source base match, current work reuses an earlier implementation, includes fresh reviewer work, and has different native context/skills and validation workloads. Only one run per workflow is present; no predeclared paired repetitions or alternating order were used. Current publication also preserves newer dependency/security changes. Historical baseline quality is reported by its committed evidence and is not rerun here. Previous branch rubric scores used different scoring rules, so their totals are not directly compared with this policy.

Existing baseline evidence is useful and has now been incorporated. It does not satisfy this policy's controlled-comparison condition for efficiency points. To establish a harness effect, freeze both workflows and generation settings at the same clean base, predeclare at least two paired repetitions with alternating order, retain failures, measure all actors through final responses, and require equivalent passing quality. Compare tokens per accepted task, estimated cost, success rate and latency separately.

## Deliverables

- [Completed source, patch, reports, logs and independent verifiers](apps/docs/static/task-a-evaluation/deliverables.zip)
- [Complete original-task usage](apps/docs/static/task-a-evaluation/usage.json)
- [Cost calculation](apps/docs/static/task-a-evaluation/cost-estimate.json)
- [Rubric details](apps/docs/static/task-a-evaluation/final-rubric.json)
- [Historical comparison and pinned evidence](apps/docs/static/task-a-evaluation/baseline-comparison/)
- [Publication provenance](apps/docs/static/task-a-evaluation/publication.json)

Root evaluation-record updates are explicitly requested by the user and are publication documentation; the original Task A feature boundary remains unchanged.

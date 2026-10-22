# Evaluation Scoring Details — Iteration 8, Task Set B

Evaluated 2026-10-22 against feature commit `8ca116b8a51f5350883ceb211c6c1f81449ab1b8` on `dn-oai-8-b-out`. Evidence: fixed Task Sets A and B, commit diff from `8972088`, local Cellix architecture reference, session `01a16083-b6e6-7bb3-b756-484abe3c8fb6`, independent `pnpm run verify`, and rendered API pages. Scores use `evaluation-category-scoring-rubric.md`. Evaluation edits and the pre-existing untracked `clean-workspace.mjs.txt` are outside the feature commit.

## Score summary

| Category | Weight | Score | Weighted result |
| --- | ---: | ---: | ---: |
| Functional Correctness | 20% | 5 | 20 |
| Test and Validation Performance | 15% | 5 | 15 |
| Architecture and Codebase Alignment | 15% | 5 | 15 |
| Security and Guardrail Compliance | 15% | 5 | 15 |
| Harness Engineering Effectiveness | 10% | 5 | 10 |
| Context Token and Cost Efficiency | 10% | 5 | 10 |
| Developer Workflow Fit | 10% | 4 | 8 |
| Operational and Vendor Readiness | 5% | 3 | 3 |
| **Total** | **100%** |  | **96 / 100** |

Recommendation: **Candidate for cage match**. The passing scans have policy-ignored findings; they are not equivalent to zero known vulnerabilities or production approval.

## Requirements and acceptance

- Task Set A: 11/11 functional requirements and 12/12 acceptance criteria appear satisfied. Course search includes 12 fixtures, case-insensitive text and tag matching, modality/status filtering, pagination, three sorts, and 400 errors. A-AC11 has **two distinct executed combined-filter inputs** in `packages/axc/application-services/src/contexts/training/training.test.ts`: `q=SECURITY&modality=online&status=active` expects `course-001`; `q=cloud&modality=in-person&status=active&tag=security` expects `course-002`. The first fixture set contains `course-002` (wrong modality), `course-003` (wrong status), and other active online courses without the keyword, so dropping any of the three required predicates changes the exact expected IDs.
- Task Set B: 17/17 functional requirements and 15/15 acceptance criteria appear satisfied. The implementation validates active courses, email and 20–500-character justification; prevents pending and approved duplicates; supports retrieval, three list filters, four valid transitions, rejection reason, and creation/change history. Focused tests exercise these rules at domain, persistence, and application boundaries. Host acceptance covers search, creation failures, creation/retrieval/list, duplicate rejection, approval/cancellation, invalid transition, and status/history response fields.
- Both API pages render endpoint headings, examples, success statuses, and error tables. The enrollment page describes the updated request as the PATCH response and shows the appended history entry; its complete object shape is illustrated by the create and retrieval examples.
- **Assessment:** 28/28 functional requirements and 27/27 acceptance criteria supported. This is a review judgment from code and executed tests, not a claim that each criterion has its own isolated test.

## Category rationale

### Functional Correctness — 5/5

All requested endpoints and business rules are present. The prior iteration's two observed gaps are closed: A-AC11 has two discriminating combined searches, and the enrollment documentation's retrieval and status-change sections render as headings. No functional requirement remains open in this review. In-memory requests reset on host restart, as the documentation states and the sample task permits.

### Test and Validation Performance — 5/5

The independent full gate passed: script policy, Biome, typecheck, build, rendered docs, Knip, dependency analysis, 38 architecture tests, 29 Turbo test tasks, audit, and Snyk. The test task includes 11 AXC domain, 5 persistence, and 20 application-service tests; host acceptance passed 4/4 scenarios. Focused adapter/converter, repository, unit-of-work, and composition tests cover round trips, nested history, defensive copying, repository creation/rehydration, commit, rollback, and concurrent duplicate checks. Application tests check rejected writes leave state unchanged. Host list filtering asserts a count, while focused application tests assert exact IDs for individual and combined filters; this is a remaining evidence-depth limit, not a failed check. The first independent gate stopped at sandbox host startup; the unchanged full command passed with local socket access.

### Architecture and Codebase Alignment — 5/5

`training` is consistent across layers. Course is a persisted aggregate despite query-only endpoints, with props, entity reference, value objects, creation factory, exports, and focused tests. EnrollmentRequest uses a Cellix seedwork aggregate, creation factory, constrained values, owned history values, seedwork repository and unit-of-work contracts, separate storage adapter and converter, repository creation/rehydration/save conversion, and nested entity/context/data-source composition. Queries use the read data source, while mutations use a scoped transaction. The API composition root injects the data-source factory; operations are separate curried application-service files with application-owned public contracts; REST maps application errors to HTTP. The local `case/service-ticket/v1` slice is the command reference. In-memory persistence is the task's storage substitution. Passport authorization, integration events, and versioning have no corresponding behavior in this sample task.

### Security and Guardrail Compliance — 5/5

The feature diff stays within the permitted feature tree plus the root lockfile changes corresponding to workspace dependency declarations. It adds no secrets, production settings, real authentication, external integration, or vendored Cellix edits. No feature-attributable security issue was identified. Independent `pnpm audit` reports **one high advisory ignored by existing policy**; Snyk reports **13 ignored issues (10 high, 3 medium), zero open**, across 23 projects. These ignores were present in the starting branch and need separate policy review; scan exit success does not erase them. The score uses the same feature-attribution basis as iteration 7.

### Harness Engineering Effectiveness — 5/5

The rendered-document checker is part of the engineered harness. It validates Markdown fences and confirms that required source headings appear in the generated HTML, turning a defect that escaped iteration 7's successful docs build into a deterministic verification failure. In iteration 8, that checker passed and the enrollment retrieval and status-change sections rendered correctly. This is direct evidence that the harness improved both output quality and repeatability.

The baseline's 4m 38s duration is not a meaningful speed target because that run stopped without comparable architecture, acceptance, documentation, and full-gate quality. For speed, iteration 7 is the closer comparison: iteration 8 reduced active time from 23m 56s to 13m 43s, a 42.7% improvement, while also closing iteration 7's search-test and rendered-documentation gaps. Compared with the Task Set B baseline, total token use fell 52.2%; compared with iteration 7, quality, speed, and repeatability improved. Together with the rendered-document checker and broader deterministic gates, the evidence supports 5/5.

### Context Token and Cost Efficiency — 5/5

The comparison point is the Task Set B baseline on `dn-oai-0-b-out`, not iteration 7. Both runs used brand-new sessions.

| Metric | Task B baseline | Iteration 8 | Change |
| --- | ---: | ---: | ---: |
| Total tokens | 1,625,641 | 776,841 | 52.2% lower |
| Input tokens | 1,608,367 | 739,433 | 54.0% lower |
| Cached input | 1,551,232 | 585,024 | 62.3% lower |
| Uncached input | 57,135 | 154,409 | 170.3% higher |
| Output tokens | 17,274 | 37,408 | 116.6% higher |
| Reasoning tokens | 4,489 | 5,570 | 24.1% higher |
| Active time | 4m 38s | 13m 43s | 196.0% higher |
| Final rubric score | 67/100 | 96/100 | 29 points higher |

Iteration 8 used less than half the baseline's total tokens while producing a much more complete and better-validated result. It spent more uncached input, output, reasoning, and active time, consistent with the additional architecture, focused tests, host acceptance, documentation validation, and full verification. With actual dollar cost excluded from scoring, this quality-per-total-token improvement meets the 5/5 band for strong results with clearly justified token usage. The branches start from different repository commits, so the ratios describe observed whole-run efficiency rather than a controlled estimate of the harness change alone.

### Developer Workflow Fit — 4/5

The supplied log contains one initial user prompt and no subsequent human redirects. The agent corrected transient dependency, type, Knip, and sandbox-host issues, completed the gate, and left a reviewable commit. The initial independent evaluation used Node 22 and stopped at the engine check; Node 24 is installed and the unchanged verification gate passed with local socket permission. Those environment corrections do not indicate a product failure, but they are workflow friction.

### Operational and Vendor Readiness — 3/5

The run used `gpt-6-sol` through ChatGPT Business. Organization approval, audit controls, procurement terms, and production-use evidence were not supplied. Existing security-policy ignores also require review before a pilot decision.

## Verification record

| Check | Observed result |
| --- | --- |
| Independent `pnpm run verify` with Node 24 and socket access | Passed all stages; 29/29 Turbo test tasks, 4/4 host scenarios, 38/38 architecture tests, audit, and Snyk. |
| AXC focused tests within gate | Domain 11/11, persistence 5/5, application services 20/20. |
| Rendered docs | `docs:check` passed; generated HTML contains all enrollment endpoint headings, success sections, examples, and error tables. |
| Security | Audit: 1 high ignored. Snyk: 0 open, 13 ignored across 23 projects. |
| Initial independent runs | Node 22 engine check stopped before tests. Node 24 sandbox run stopped at host bind; unchanged escalated run passed. |
| Worktree boundary | Feature commit changes only allowed feature paths and justified `pnpm-lock.yaml` updates; `clean-workspace.mjs.txt` was pre-existing and untouched. |

The prior iteration's 83/100 scoring files were untracked evaluation artifacts in this worktree. This update replaces their score summary for iteration 8; it does not alter the fixed task prompts or the feature commit.

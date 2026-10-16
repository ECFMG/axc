# Evaluation Scoring Details

Evaluated on 2026-10-16 against the feature output now committed on `dn-oai-6-b-out` at `632980d664f168dccc1debcf7ea5975783d1e023` (`output of harness 6`). The comparison baseline is `dn-oai-0-b-out` at `ef71b54e13a30651467cb6a98f514493713b5405`, evaluated at 67/100. Separate harness/evaluation edits remain outside the feature commit. Scores use the whole-number 0–5 rubric in `evaluation-category-scoring-rubric.md`.

## Score Summary

| Category | Weight | Score | Weighted result |
| --- | ---: | ---: | ---: |
| Functional Correctness | 20% | 5 | 20 |
| Test and Validation Performance | 15% | 5 | 15 |
| Architecture and Codebase Alignment | 15% | 5 | 15 |
| Security and Guardrail Compliance | 15% | 5 | 15 |
| Harness Engineering Effectiveness | 10% | 4 | 8 |
| Context Token and Cost Efficiency | 10% | 3 | 6 |
| Developer Workflow Fit | 10% | 4 | 8 |
| Operational and Vendor Readiness | 5% | 3 | 3 |
| **Total** | **100%** |  | **90 / 100** |

Security hard rule: **Not triggered.** No feature-attributable serious security or guardrail violation was found. Per the evaluation scope, Snyk is excluded from scoring; its attempted run was skipped because the CLI is unavailable.

Recommendation: **Remediate.**

## Baseline Comparison

| Category | Baseline | Iteration 6 | Change | Evidence of change |
| --- | ---: | ---: | ---: | --- |
| Functional Correctness | 4 | 5 | +1 | The composed HTTP workflow passes and the feature is implemented across all required layers. |
| Test and Validation Performance | 3 | 5 | +2 | Baseline had only service tests; this run adds domain, persistence, architecture, and HTTP acceptance coverage. |
| Architecture and Codebase Alignment | 2 | 5 | +3 | The anemic baseline domain and concrete repository construction were replaced by a Cellix aggregate, contracts, injected data sources, and scoped unit of work. |
| Security and Guardrail Compliance | 5 | 5 | 0 | Neither evaluation found a feature-attributable serious security issue. |
| Harness Engineering Effectiveness | 3 | 4 | +1 | Quality and test repeatability improved in two meaningful areas versus the baseline. |
| Context Token and Cost Efficiency | 3 | 3 | 0 | Higher usage bought a stronger result, but dollar cost is unavailable. |
| Developer Workflow Fit | 3 | 4 | +1 | The run completed more verification and produced a more reviewable implementation. |
| Operational and Vendor Readiness | 3 | 3 | 0 | Both runs used the same Business plan; organizational approval remains unverified. |
| **Weighted total** | **67** | **90** | **+23** |  |

The baseline used 1,625,641 total tokens (57,135 uncached input), 17,274 output tokens, and 4m 38s wall time. This run used 15,584,146 total tokens (175,306 uncached input), 43,208 output tokens, and 12m 44s wall time: about 9.6× total tokens, 3.1× uncached input, 2.5× output, and 2.75× wall time. Cache share rose from 96.4% to 98.9%. Those figures show an efficiency tradeoff, not a measured dollar-cost comparison; credits and actual spend remain unavailable.

## Category Evidence

### Functional Correctness — 5/5

- All 28 functional requirements across Task Sets A and B are represented in the implementation.
- The course fixture contains 12 mixed courses. Search implements case-insensitive keyword matching across title, summary, and tags; modality, status, and exact case-insensitive tag filtering; pagination; three sort fields; and no-match metadata.
- Enrollment creation checks course existence and active status, email format, justification boundaries, and case-insensitive duplicate active requests. It creates a pending request and initial history entry.
- Retrieval, filtered listing, valid transitions, invalid-transition conflicts, rejection reasons, timestamps, actor fields, and append-only history are implemented.
- The composed HTTP suite passed all 4 scenarios, including 3 training scenarios, when run outside the process sandbox.
- Acceptance criteria are assessed as 25/27. A-AC11 has two syntactic filter combinations, including `q` + `modality` + `status` in a service test, but the fixtures and assertions do not reveal an ignored modality or status predicate. B-AC14's list-filter test creates only one request, so ignoring `courseId` or `learnerEmail` would still pass. The filter implementations themselves meet the functional requirements.

### Test and Validation Performance — 5/5

- Fresh focused domain run: 2 files, 9/9 tests passed. Aggregate transitions and value boundaries are tested in the owning package.
- Fresh focused application-service run: 4 files, 16/16 tests passed with no type errors.
- Fresh persistence adapter run: 1 file, 2/2 tests passed. It directly covers commit, rollback, concurrent serialization, and defensive copying.
- Architecture suites: 32/32 tests passed from Turbo cache.
- Acceptance: 4/4 scenarios passed in the unchanged escalated rerun. The sandboxed run failed before any scenario because the API host exited while the harness was managing its fixed local port; the unchanged run passed outside the process sandbox.
- Typecheck passed 23/23 Turbo tasks and build passed 18/18, both entirely from cache; this limits fresh compiler/build evidence.
- Knip produced no actionable unused-code findings and 33 configuration hints. Biome passed all 324 files in the evaluated `apps`, `packages`, and lockfile scope.
- `pnpm run verify` did not pass: repository-wide Biome reported formatting outside the evaluated feature scope. All later stages were run individually; Snyk's skipped status is recorded but excluded from this evaluation.
- The added tests are useful at all four layers and pass. Course-search and enrollment-list filters would benefit from competing records and exact expected IDs; current assertions could pass if some predicates were ignored. This is retained as an acceptance-evidence gap, while the tested implementation and overall validation performance meet this category's 5/5 description.

### Architecture and Codebase Alignment — 5/5

The implementation was compared with the local Cellix sources, including:

- `apps/api/src/index.ts`
- `packages/ocom/application-services/src/index.ts`
- `packages/ocom/application-services/src/contexts/service/index.ts`
- `packages/ocom/application-services/src/contexts/community/index.ts`
- `packages/ocom/application-services/src/contexts/service/service/index.ts`
- `packages/ocom/application-services/src/contexts/service/service/create.ts`
- `packages/ocom/application-services/src/contexts/user/end-user/query-by-name.ts`
- `packages/ocom/persistence/src/index.ts`
- `packages/ocom/persistence/src/datasources/index.ts`
- `packages/ocom/persistence/src/datasources/readonly/community/index.ts`
- `packages/ocom/persistence/src/datasources/readonly/community/community/index.ts`
- `packages/ocom/persistence/src/datasources/readonly/community/community/community.read-repository.ts`
- `packages/ocom/domain/src/domain/contexts/community/community/community.repository.ts`
- `packages/ocom/domain/src/domain/contexts/case/service-ticket/v1/service-ticket-v1.aggregate.ts`
- `packages/ocom/domain/src/domain/contexts/case/service-ticket/v1/service-ticket-v1.repository.ts`
- `packages/ocom/domain/src/domain/contexts/case/service-ticket/v1/service-ticket-v1.uow.ts`
- `packages/ocom/domain/src/domain/contexts/case/service-ticket/v1/index.ts`
- `packages/ocom/persistence/src/datasources/domain/case/service-ticket-v1/{service-ticket-v1.domain-adapter.ts,service-ticket-v1.repository.ts,service-ticket-v1.uow.ts,index.ts}`

Alignment findings:

- `training` is used consistently across domain, application services, persistence, data-source namespaces, and the public service API.
- API composition constructs and injects `DataSourcesFactory`; the application-services host does not construct concrete persistence.
- Application operations are curried with `DataSources`. Queries use `readonlyDataSource`; mutations use a scoped domain unit of work.
- Read contracts and implementations use the Cellix `*.read-repository.ts` structure in persistence. Mutation repository and unit-of-work contracts live in domain.
- Enrollment is a `@cellix/domain-seedwork` aggregate with props, an entity reference, transition methods, constrained email/justification/status value objects, and status-history values. The mutation repository and unit of work extend the seedwork contracts. Focused aggregate and value-object tests now live beside the domain files.
- Entity, context, data-source, and package composition files are present. Context composition aliases entity APIs and declares explicit service interfaces.
- REST is feature-oriented and depends on application-service contracts rather than persistence.
- The in-memory adapter deliberately replaces a database-backed reference and directly tests the required commit, rollback, serialization, and cloning semantics.

Behavior-based deviations:

1. The sample uses a cloned in-memory record adapter rather than Cellix's Mongoose converter and model. The task prohibits a real database, and direct tests cover commit, rollback, serialization, and copying. Switching storage later would require a new adapter, not a domain rewrite.
2. Status history is a value object array because entries have no separate identity or independent lifecycle. The task has no authorization policy, external domain-event consumer, or concurrent version contract, so the reference ticket's visa/passport, integration events, versioning, and child entities do not apply. Adding those behaviors later would extend the aggregate and persistence adapter.
3. The REST transport uses Hono feature modules because this application exposes HTTP endpoints rather than Cellix GraphQL features; the responsibility split remains aligned.

### Security and Guardrail Compliance — 5/5

- No feature-attributable boundary violation, secret, production configuration, authentication change, or external production integration was found.
- `pnpm audit --audit-level=high` reported three vulnerabilities: one moderate `smol-toml` development advisory (`GHSA-r4xh-jqrq-34v2`) and two ignored high advisories. The command exited successfully under the configured threshold/ignore policy.
- `pnpm run snyk` printed `SKIPPED` because the CLI is absent. Snyk is excluded from scoring, and the skip is not presented as a passing scan.
- Dependency changes are workspace edges required by composition/testing, and the lockfile diff is limited to those declarations.
- The 5/5 score applies to the feature output: no new unsafe code, secret, dependency advisory, or prohibited change was found. It does not reclassify the existing advisories as clean results; Snyk has no score impact.

### Harness Engineering Effectiveness — 4/5

- The run workflow, Cellix guidance, architecture tests, focused adapter semantics, acceptance harness, and verification script provide meaningful quality controls.
- The baseline scored 67/100: its domain was mostly interfaces and enums, its application service constructed concrete persistence, and its added tests covered only the service layer. It had no new HTTP acceptance scenarios. Iteration 6 scores 90/100, with the Cellix aggregate/data-source structure and focused domain, application, adapter, architecture, and HTTP checks. This demonstrates clear improvement in architecture and validation depth, supporting 4/5.
- The run is slower and uses more tokens, and two filter-test adequacy criteria remain unproven. Improvement in cost or speed is not claimed, so 5/5 is unsupported.

### Context Token and Cost Efficiency — 3/5

- The user supplied the local summary for session `01a14565-8877-7412-bf23-a758774837c2` (`gpt-6-sol`, Business): 15,540,938 input tokens, including 15,365,632 cached; 43,208 output tokens, including 7,276 reasoning; 15,584,146 total tokens.
- Uncached input was 175,306 tokens, and 98.9% of input was cached. The session took 12m 43s active and 12m 44s wall. The earlier 7,633,908-token figure was superseded by this run-specific summary.
- Compared with the baseline's 1,625,641 total tokens, 57,135 uncached input, 17,274 output, and 4m 38s wall time, this run used 9.6× total tokens, 3.1× uncached input, 2.5× output, and 2.75× wall time. The stronger implementation and broader tests justify retaining a provisional neutral 3/5 rather than claiming a cost improvement. Credits and dollar cost are unavailable, so actual spend cannot be inferred from token totals alone.

### Developer Workflow Fit — 4/5

- The implementation is reviewable and package tests are independently runnable. The unchanged acceptance suite passed outside the process sandbox. The baseline run could not run its package test/lint/build commands and required an operator to create the commit and update the lockfile; this branch has substantially more completed verification evidence.
- The prior evaluation reports no original-run redirects; the user-provided session summary reports 12m 44s wall time. A primary interaction log was not reviewed.
- The repository-wide gate remains incomplete because of formatting outside the evaluated feature scope. Snyk is outside this evaluation's scoring scope.

### Operational and Vendor Readiness — 3/5

- Both runs used `gpt-6-sol` authenticated through ChatGPT Business (`self_serve_business_prolite`). The plan alone does not show that the organization has approved procurement, security, auditability, or production use.
- The baseline scored 3/5 because those approval facts were unavailable. No new organization-specific evidence exists for this branch, so the same 3/5 applies. The stronger implementation changes product quality, not vendor readiness.

## Verification Record

| Command | Result |
| --- | --- |
| `pnpm run verify` under default Node 22 | Did not start checks; repository requires Node 24+ |
| `pnpm run verify` with Node 24 | Script policy passed; stopped at Biome formatting outside the evaluated feature scope; full gate did not pass |
| `pnpm run typecheck` with Node 24 | 23/23 Turbo tasks passed; all cache hits |
| `pnpm run build` with Node 24 | 18/18 Turbo tasks passed; all cache hits |
| `pnpm run knip` | Passed; 33 configuration hints |
| `pnpm run e18e` | Completed; 229 non-error issues hidden by `--quiet` |
| `pnpm run test:arch` | 32/32 tests passed; cached |
| `pnpm run test` | 28/29 Turbo tasks passed; sandboxed acceptance API host exited before scenarios ran |
| Escalated unchanged `pnpm run test:acceptance` | 4/4 scenarios passed; 3 training and 1 healthcheck |
| Fresh domain Vitest run | 9/9 passed |
| Fresh application-service Vitest run | 16/16 passed |
| Fresh persistence Vitest run | 2/2 passed |
| `pnpm exec biome check apps packages pnpm-lock.yaml` | Evaluated feature scope: 324 files passed |
| `pnpm run audit` with network access | Completed; 1 moderate and 2 ignored high vulnerabilities |
| `pnpm run snyk` | `SKIPPED`: CLI absent; scan not completed; excluded from evaluation scoring |
| `git diff --check` and `git diff --cached --check` | Passed |

## Required Remediation

1. Add course fixtures/assertions that distinguish each filter, including `q` + `modality` + `status`, and assert exact expected IDs for two combinations.
2. Create competing enrollment requests and assert exact results for each list filter and their combination.
3. Review the moderate and two policy-ignored high advisories.

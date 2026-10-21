# Evaluation Run Record — Task B, run 5

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Dane Fortun (operator); Codex implementation assistant |
| Reviewer | Assistant self-assessment only; independent reviewer not assigned |
| Harness | Native Codex Desktop; supplied OpenAI harness v7.12.02 inspected, not executed as a provider experiment |
| Model | gpt-6.1-sol; medium reasoning, recorded in original turn_context |
| License / Plan | Not used for accounting; subscription billing not measured |
| Codebase | ECFMG/axc |
| Task Set | B, with existing Task A seeded implementation preserved and validated |
| Run Type | Seeded implementation; not a matched harness/model benchmark |
| Harness Engineering Used | No harness modifications; one main agent; no subagents |
| Config / Diff Notes | 12 changed/new implementation files within permitted paths; no added dependencies, authentication, Cellix or production changes. Publication evidence added under subsequent explicit user request. |
| Branch / Commit | Publication branch: df-oai-5-b-out. Measured implementation seed: d6153e2f09645297fc17749a438e7728d9754fe0. Tested source is the linked source ZIP and patch, not the inherited application tree on this publication branch. |
| Requirements Completed / Attempted | Task A A1–A11 preserved; Task B B1–B17 implemented |
| Acceptance Criteria Passed / Total | A: 12/12; B: 15/15 mapped to tests and documentation inspection; not independent acceptance certification |
| Tests Passed / Failed | 655 passed, 0 failed; 4/4 live API acceptance scenarios; 9/9 architecture checks. Full uncached run: 26/26 tasks, zero cached. |
| Static Analysis / Security Findings | Lint: 205 files, pass. Typecheck: 21/21 tasks, pass. Build: 18/18 tasks, pass. Direct documentation build: pass. No dedicated security scan. |
| Input Tokens | 3,067,252 |
| Cached Tokens | 2,976,384; included in input |
| Output Tokens | 20,402; includes 2,478 reasoning tokens |
| Total Tokens or Credits Used | 3,087,654; complete exposed original main-turn counters, including final response |
| Estimated Cost | $0.6833944 (approximately $0.68), API-equivalent estimate at supplied Standard rates; not actual billing |
| Elapsed Time | 0:09:43.932000, original task_started through task_complete |
| Number of Human Interventions / Redirects | 0 during original implementation turn; this publication follow-up excluded |
| Reviewer Notes | No independent reviewer. Earlier compile failures and sandbox port restrictions were resolved; retained logs identify intermediate attempts. |
| Final Rubric Score | Assistant-assessed subtotal **22/25**; overall **/30 unassigned** under supplied policy because efficiency evidence is missing |
| Recommendation | Continue for sample review; obtain independent review and matched comparison before efficiency scoring or savings claims |

## Publication and source provenance

This record supersedes a different run's inherited record on the target branch. That record is retained as [previous branch record](apps/docs/static/evaluation/task-b-run-5/previous-branch-evaluation-run-record.md); its usage, reviewers, comparisons and outcomes are not attributed to this run.

The user requested publication of this run's information and completed deliverables. **This is an evidence publication: the branch's inherited application code is preserved.** Validation below applies to the [completed source ZIP](apps/docs/static/evaluation/task-b-run-5/axc-task-b-completed.zip), built from clean Task A seed `d6153e2f09645297fc17749a438e7728d9754fe0`, and the [Task B patch](apps/docs/static/evaluation/task-b-run-5/task-b.patch). The patch passed `git apply --check` against that seed; archive integrity passed. The original implementation was delivered without any commits as requested at that time.

The supplied archive contained evaluation-harness Python code and Task A specifications, not the AXC application. The clean AXC checkout alongside the referenced Task B documents supplied the application source. See [implementation report](apps/docs/static/evaluation/task-b-run-5/implementation-report.json) for paths and archive hash.

## Requirements satisfied

Course search retains 12 varied fixtures, the required Course fields, case-insensitive keyword/tag search, combined modality/status/tag filters, pagination, all three sorts, and 400 validation errors.

Enrollment adds POST creation, GET by ID, filtered GET collection, and PATCH status routes. Active-course lookup, email and 20–500-character justification checks, initial pending state, normalized-email duplicate protection, all four valid transitions, rejection reasons and immutable response snapshots are implemented. Creation and successful changes append status history; errors preserve state. Azure Functions wiring is exercised by a live enrollment workflow. API documentation covers request/response bodies and error codes.

The sample map repository, model and transition rules follow the existing fixture/use-case placement in application-services. No new domain/persistence package dependencies or separate mapper package were introduced; mapping to JSON uses detached snapshots. Storage is process-local, resets on restart and provides no cross-worker duplicate coordination. Operator identity follows unauthenticated sample conventions. These are sample limitations, not claims of production readiness.

## Validation

| Command | Final result | Evidence |
| --- | --- | --- |
| `pnpm test` | PASS, 26/26 tasks; 655 tests and 4 live scenarios | [Full suite](apps/docs/static/evaluation/task-b-run-5/validation/tests.log) |
| `pnpm exec turbo run test test:acceptance --force` | PASS, 26/26 tasks, zero cached; 550 Vitest + 105 Node tests | [Uncached full suite](apps/docs/static/evaluation/task-b-run-5/validation/tests-uncached.log) |
| `pnpm --filter @apps/api test` | PASS, 46 course + 59 enrollment tests | [API tests](apps/docs/static/evaluation/task-b-run-5/validation/api-tests.log) |
| `pnpm run lint` | PASS, 205 files | [Lint](apps/docs/static/evaluation/task-b-run-5/validation/lint.log) |
| `pnpm run typecheck` | PASS, 21/21 tasks | [Typecheck](apps/docs/static/evaluation/task-b-run-5/validation/typecheck.log) |
| `pnpm run test:arch` | PASS, 9 checks | [Architecture](apps/docs/static/evaluation/task-b-run-5/validation/architecture.log) |
| `pnpm run build` | PASS, 18/18 tasks; cache behavior disclosed in log | [Build](apps/docs/static/evaluation/task-b-run-5/validation/build.log) |
| `pnpm --filter @apps/docs build` | PASS, direct build bypasses pre-existing Turbo docs-input omission | [Docs build](apps/docs/static/evaluation/task-b-run-5/validation/docs-build.log) |

The project uses pnpm; equivalent project commands were used instead of npm. Initial sandbox execution could not bind the existing local MongoDB/Azure test ports. The final local run with networking permitted passed. Intermediate compile failures, interrupted tests, and the sandbox failure are preserved separately from successful final results. No independent course oracle, frozen harness eight-gate protocol, audit/Snyk scan, or independent code review was performed.

## Actual usage and measurement boundaries

Original session: `01a15ee8-7a96-7042-8302-69006701b877`. Original task/turn: `01a15ee8-b6cd-74b2-995c-aa935f083eaf`.

- Task start: `2026-10-21T14:41:11.893Z`.
- Baseline capture: `2026-10-21T14:41:29.237140+00:00`. No pre-task token_count existed; zero starting counters are inferred because the fresh session's first cumulative counters equal its first-call counters.
- Final recorded counters: `2026-10-21T14:50:55.753Z`.
- Task complete: `2026-10-21T14:50:55.825Z`.
- Scope: original inspection, planning, implementation, validation, reporting **and final assistant response**. This publication follow-up is excluded. No subagents were used.

| Counter | Starting cumulative | Ending cumulative | Task usage |
| --- | ---: | ---: | ---: |
| Input | 0 | 3,067,252 | 3,067,252 |
| Cached input (included above) | 0 | 2,976,384 | 2,976,384 |
| Output | 0 | 20,402 | 20,402 |
| Reasoning output (included above) | 0 | 2,478 | 2,478 |
| Total | 0 | 3,087,654 | 3,087,654 |
| Cache writes | 0 | 0 | 0 |

Usage is ending cumulative minus starting cumulative, never a sum of cumulative snapshots. Input already includes cached input; output already includes reasoning output. Exposed original native counters are complete, and the final response has been recovered. Any automatic approval-review/tool-side model usage is unexposed and unmeasured; actual invoice/credit charges are unmeasured. Local source-log path and original boundaries are in [usage.json](apps/docs/static/evaluation/task-b-run-5/usage.json); [token events](apps/docs/static/evaluation/task-b-run-5/original-token-events.json) retain only measurement events, without conversation text.

## Projection versus measurement

The recorded projection was **250,000 tokens**, range **150,000–500,000**. Assumptions: one agent, usable local source, expanded course/enrollment changes and local validation. It was recorded early after initial specification/archive inspection, not before the first inspection; the task's usage scope includes that inspection. Actual usage was **3,087,654 tokens**, approximately **12.35×** the point forecast. The projection substantially underestimated repeated cumulative input. This is disclosed separately and earns no efficiency points.

## Estimated cost

Using the supplied Standard rate card, corroborated by the [official model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol) on October 21, 2026:

| Component | Tokens | USD per million | Estimated USD |
| --- | ---: | ---: | ---: |
| Uncached input (`input − cached`) | 90,868 | 2.00 | 0.181736 |
| Cached input | 2,976,384 | 0.10 | 0.2976384 |
| Cache writes | 0 | 2.50 | 0 |
| Output, reasoning included | 20,402 | 10.00 | 0.20402 |
| **Total** | | | **0.6833944** |

Largest recorded per-request input: **106,674 tokens**, so no request exceeded 272,000 input tokens. The long-context threshold applies per request, not to aggregate task input. No surcharge is applied. Standard tier is an assumption; service tier is not recorded in the native turn metadata. This is an API-equivalent estimate, not an account charge, subscription cost or invoice. Publication work, taxes, credits and unexposed tool billing are excluded. See [cost calculation](apps/docs/static/evaluation/task-b-run-5/cost-estimate.json) and [supplied rate card](apps/docs/static/evaluation/task-b-run-5/rate-card.png).

## Final rubric assessment

Retrospective **assistant self-assessment**, not independent human review. Categories follow the [supplied policy](apps/docs/static/evaluation/task-b-run-5/rubric-policy.json).

| Category | Score | Rationale |
| --- | --- | --- |
| Functional correctness | 5/5 | A course behavior preserved; B creation, validation, duplicates, retrieval, filtering, all transition pairs, audit and error cases exercised. 59 enrollment tests and live host workflow pass. |
| Tests and validation | 4/5 | 655 tests and 4 live scenarios pass uncached; lint/typecheck/build/docs and 9 architecture checks pass. The harness-specific frozen eight-gate protocol and independent course oracle were not executed for this run. |
| Architecture and codebase alignment | 4/5 | Existing factory composition and fixture placement preserved, no dependencies; architecture checks pass. Model, map repository and transition rules are together in application-services; no fresh independent architecture review or separate domain/persistence mapper package. |
| Security and guardrail compliance | 5/5 | Original 12-file change set stayed inside allowed paths; no authentication, Cellix, production, external integration or dependency changes. Input validation and detached response data tested. Dedicated security scan not performed; no assertion of vulnerability-free code. |
| Context/token/cost efficiency | Unscored /5 | No predeclared matched comparison. Absolute usage, cache hit rate, forecast error and estimated price cannot establish savings. |
| Developer workflow fit | 4/5 | Archive, applicable patch, API docs, final validation logs and complete native original-turn accounting provided. No independent reviewer evidence; baseline is inferred zero rather than pre-task recorded snapshot. |

**Assessed subtotal: 22/25. Overall /30: unassigned.** The supplied policy requires six evidence-backed scores; the efficiency category lacks a predeclared matched comparison. Missing comparison evidence cannot be replaced with a forecast, cache hit rate, absolute price or invented savings score. No comparison to a prior run is asserted. Independent reviewer judgment is also pending. These are assessment gaps; there are no unresolved failures in this run's implementation validation.

See [machine-readable rubric](apps/docs/static/evaluation/task-b-run-5/rubric-assessment.json). The recommendation is **Continue for sample review**, with matched comparison and independent review before efficiency conclusions.

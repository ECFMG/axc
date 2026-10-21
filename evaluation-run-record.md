# Evaluation Run Record — Task B, run 5 (integrated publication)

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
| Branch / Commit | df-oai-5-b-out; integrated and validated implementation [`cee180c`](https://github.com/ECFMG/axc/commit/cee180cb8a45deff21d2d2e405486e8ca7d15a6b). Original measured seed: d6153e2f09645297fc17749a438e7728d9754fe0. |
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
| Final Rubric Score | **25/30 (83.3%)**, final retrospective assistant self-assessment of integrated source; independent review pending. Strict archived-policy score remains unassigned; methods distinguished below. |
| Recommendation | Candidate for independent sample review. Integrated branch validation passes; no production-readiness or causal savings claim. |

## Publication and source provenance

This record supersedes a different run's inherited record on the target branch. That record is retained as [previous branch record](apps/docs/static/evaluation/task-b-run-5/previous-branch-evaluation-run-record.md); its usage, reviewers, comparisons and outcomes are not attributed to this run.

The initial publication preserved the inherited application tree while delivering this run's code in a ZIP and patch. The user then explicitly requested integration. That mismatch is now corrected: **the branch contains this run's course and enrollment implementation**, and superseded enrollment modules/test wiring have been removed. Newer root dependency/security changes and unrelated features are preserved.

The integrated application source at [`cee180c`](https://github.com/ECFMG/axc/commit/cee180cb8a45deff21d2d2e405486e8ca7d15a6b) passed a fresh frozen-lockfile install and complete validation on the publication branch's dependencies. See [integration validation](apps/docs/static/evaluation/task-b-run-5/integration/validation.json), [source tree](apps/docs/static/evaluation/task-b-run-5/integration/validated-source-tree.txt), and [integration inventory](apps/docs/static/evaluation/task-b-run-5/integration/integration-inventory.json). The report/evidence follow-up commit does not change that validated application source.

The [original completed source ZIP](apps/docs/static/evaluation/task-b-run-5/axc-task-b-completed.zip) and [original Task B patch](apps/docs/static/evaluation/task-b-run-5/task-b.patch) remain historical artifacts measured on seed `d6153e2`. Original validation and original usage below are retained; integration validation is recorded separately. The pre-integration record is retained [here](apps/docs/static/evaluation/task-b-run-5/integration/record-before-integration.md).

## Integrated branch validation

| Check | Result |
| --- | --- |
| Fresh `pnpm install --frozen-lockfile --offline --ignore-scripts` | PASS; pnpm 11.11.0; lockfile unchanged |
| Full uncached `turbo run test test:acceptance --force` | PASS; 26 tasks, zero cached; 655 tests and 4 live API scenarios |
| Lint | PASS; 223 files |
| Typecheck | PASS; 21 tasks |
| Architecture | PASS; 9 application checks |
| Workspace build | PASS; 18 tasks |
| Direct docs build | PASS |

[Integration logs](apps/docs/static/evaluation/task-b-run-5/integration/tests.log) retain the live course, enrollment and health scenarios. The initial docs build found a link to an absent historical validation document; the implementation notes were corrected, and final builds passed. No new dependencies, root lockfile changes, Cellix changes, authentication changes or security-script changes were needed. No dedicated security scan or independent human review is claimed.

The supplied archive contained evaluation-harness Python code and Task A specifications, not the AXC application. The clean AXC checkout alongside the referenced Task B documents supplied the application source. See [implementation report](apps/docs/static/evaluation/task-b-run-5/implementation-report.json) for paths and archive hash.

## Requirements satisfied

Course search retains 12 varied fixtures, the required Course fields, case-insensitive keyword/tag search, combined modality/status/tag filters, pagination, all three sorts, and 400 validation errors.

Enrollment adds POST creation, GET by ID, filtered GET collection, and PATCH status routes. Active-course lookup, email and 20–500-character justification checks, initial pending state, normalized-email duplicate protection, all four valid transitions, rejection reasons and immutable response snapshots are implemented. Creation and successful changes append status history; errors preserve state. Azure Functions wiring is exercised by a live enrollment workflow. API documentation covers request/response bodies and error codes.

The sample map repository, model and transition rules follow the existing fixture/use-case placement in application-services. No new domain/persistence package dependencies or separate mapper package were introduced; mapping to JSON uses detached snapshots. Storage is process-local, resets on restart and provides no cross-worker duplicate coordination. Operator identity follows unauthenticated sample conventions. These are sample limitations, not claims of production readiness.

## Original task validation

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

**25/30 (83.3%) — retrospective assistant self-assessment of the integrated implementation.** This uses the six category names with a retrospective observational efficiency assessment, as requested during follow-up. It is not independent human approval and does not claim completion of the archived policy's predeclared matched-experiment requirements.

| Category | Score | Rationale |
| --- | --- | --- |
| Functional correctness | 5/5 | A course behavior preserved; B creation, validation, duplicates, retrieval, filtering, all transition pairs, audit and error cases exercised. 59 enrollment tests and live host workflow pass. |
| Tests and validation | 4/5 | Integrated source passes 655 uncached tests, 4 live API scenarios, 9 architecture checks, lint/typecheck/build/docs and frozen install. No independent course oracle or frozen controller eight-gate protocol was executed in this run. |
| Architecture and codebase alignment | 4/5 | Existing factory composition and fixture placement preserved, no dependencies; architecture checks pass. Model, map repository and transition rules are together in application-services; no fresh independent architecture review or separate domain/persistence mapper package. |
| Security and guardrail compliance | 5/5 | Original 12-file change set stayed inside allowed paths; no authentication, Cellix, production, external integration or dependency changes. Input validation and detached response data tested. Dedicated security scan not performed; no assertion of vulnerability-free code. |
| Context/token/cost efficiency | 3/5 | Original Task B run recorded 3,087,654 tokens and estimated USD 0.6833944 versus 5,317,215 and USD 1.2530748 in df-oai-4-b-out: 41.93% fewer tokens and 45.46% lower cost. Same declared Task A seed, model/reasoning and supplied harness version. Reviewer usage, validation and workflow differed; no isolated causal savings claim or matched-experiment certification. |
| Developer workflow fit | 4/5 | Actual publication branch source is now integrated and validated against its frozen dependencies; code, record and source manifest identify one implementation commit. Full native original-turn usage is complete. Independent review remains absent. |

### Efficiency evidence and limits

The record on `df-oai-4-b-out` reports 5,317,215 native tokens and USD 1.2530748 estimated cost, including its reviewer. This original Task B run records 3,087,654 tokens and USD 0.6833944. Both identify seed `d6153e2`, gpt-6.1-sol, medium reasoning, and the supplied v7.12.02 harness. This run used **41.93% fewer recorded tokens and 45.46% lower estimated cost**. The reference record contains a stale branch-name label; the [snapshot](apps/docs/static/evaluation/task-b-run-5/integration/reference-record.md) and [comparison data](apps/docs/static/evaluation/task-b-run-5/integration/retrospective-comparison.json) identify the actual fetched reference commit.

This is available retrospective comparison evidence. Reviewer usage, validation, workflow and cache conditions differed, so the observed reduction does not isolate a causal harness/model efficiency effect. Both cost figures exclude later publication/integration follow-ups. Task A on df-oai-5-a-out is a different task and is not substituted for this Task B comparator.

The **3/5 efficiency score** reflects the qualified observed reduction and the experiment limitations. The original archived [policy](apps/docs/static/evaluation/task-b-run-5/rubric-policy.json) requires a predeclared matched experiment for its high efficiency ratings and leaves missing-comparison cases unscored. Its original [22/25 subtotal](apps/docs/static/evaluation/task-b-run-5/rubric-assessment.json) remains historical; its strict overall /30 score remains unassigned. The final **25/30 retrospective score** uses an explicitly different assessment basis and is not represented as strict-policy certification.

See the [final machine-readable rubric](apps/docs/static/evaluation/task-b-run-5/integration/final-rubric.json). Independent reviewer judgment and production-readiness evaluation remain outside this assessment.

## Usage scope after integration

The recorded **3,087,654 tokens and USD 0.6833944 estimate** cover only the original implementation task, including its final assistant response. They do **not** include the later publication, comparison discussions, source integration, revalidation or this correction's reporting. Those follow-up turns are not added to or substituted for the original measurement. This record does not claim a complete token/cost total for the entire conversation or all delivery remediation.

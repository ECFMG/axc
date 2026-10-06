# Evaluation scoring details — current working tree

Re-evaluated on 2026-10-06 against `evaluation-category-scoring-rubric.md`, Task Set A, the user's additional architecture findings, and the course catalog output on branch `dn-oai-1-a-out`. Execution evidence comes from session `01a0f91d-5951-7a22-ac3f-a3982c4fefc1` and its local JSONL log. The corresponding Evaluation Run Record is filled in with the resulting 71/100 score.

## Findings

1. **Domain structure and contract placement do not match Cellix.** `packages/axc/domain/src/course.ts` is a flat type file instead of a context/entity module with matching exports, suffixes, and applicable companion files. Its `CourseReadRepository` interface (lines 16–18) is read-side; the Cellix counterpart defines read-repository interfaces in persistence, while domain `*.repository.ts` files describe mutation-side domain repositories. The current `packages/axc/domain/src/index.ts` also exports the read contract. The reviewer reported missing domain files, content, and features; the exact missing business behavior was not specified, so no additional Task Set A behavior failure is inferred from that report.
2. **Persistence structure and naming do not match Cellix.** `packages/axc/persistence/src/datasources/readonly/course.ts` combines the fixture and implementation in a flattened path, and `packages/axc/persistence/src/index.ts` defines the read-side binding. Cellix uses context/entity folders, a `course.read-repository.ts` equivalent for the read contract and implementation, and context/entity composition modules. Fixture storage behind a repository is a useful boundary, but it does not resolve these structural deviations.
3. **Application-service composition and context naming need rework.** `packages/axc/application-services/src/contexts/catalog/index.ts` imports `Course` without a `CourseApi` alias and does not declare a `CourseApplicationService` or `CatalogContextApplicationService` interface, unlike Cellix context composition. The application-service root exposes lowercase `catalog` while the context and data-source namespace use `Catalog`. It also calls `createDataSources()` directly at line 42 rather than receiving a data-sources factory through `ApiContext` from `apps/api`. The curried list operation and REST validation are placed appropriately.
4. **The lockfile exceeds Task Set A's stated write boundary.** `pnpm-lock.yaml` changed to record new workspace links and peer-resolution metadata. Task Set A allows edits only under its listed application, package, verification, and docs paths. This boundary exception needs an explicit review decision; no new third-party dependency was added by the feature.
5. **The execution run passed HTTP acceptance and the full suite, but architecture coverage missed these findings.** Its first sandboxed attempt could not bind localhost. The agent reran acceptance with localhost access and passed all 12 scenarios (11 course scenarios and the existing healthcheck). Its final `pnpm run test` completed all 27 tasks. The current restricted review sandbox reproduces bind failures. Passing architecture tests did not detect the misplaced read contract, folder/suffix differences, or context API shape.

## Validation evidence

| Check | Result |
| --- | --- |
| `pnpm --filter @axc/application-services test` | Passed: 4 files, 10 tests, no type errors. |
| `pnpm run lint` | Passed. |
| `pnpm run typecheck` | Passed: 23 tasks. |
| `pnpm run build` | Passed: 18 tasks. |
| `pnpm run test:arch` | Passed: 17 tasks, including 21 AgentCourses architecture tests. |
| Direct `createRestApp(...).request(...)` checks | Default list: 200 and 10 items; combined keyword/modality/status filter: 200 and 1 item; invalid `pageSize`: 400 with `INVALID_QUERY_PARAMETER`. |
| `pnpm run test:acceptance` | Execution session passed: 12 scenarios, 14/14 Turbo tasks, after granting localhost access. Current restricted review sandbox cannot start the API process. |
| `pnpm run test` | Execution session passed: 27/27 Turbo tasks, after granting localhost access. Current restricted review sandbox fails on MongoDB memory-server bind `EPERM` and API startup. |

No secret-scan, static security scan, dollar cost/credit report, or vendor approval evidence was available. Passing Turbo tasks include cache hits.

## Execution-session and harness evidence

| Field | Evidence |
| --- | --- |
| Model and plan | `gpt-6-sol`; Business (`self_serve_business_prolite`), authenticated through ChatGPT. |
| Run duration | 2026-10-01 20:17:42.803Z to 20:24:47.933Z; 7m 5s active and wall time. |
| Token usage | 2,832,337 input tokens, of which 2,745,856 were cached (96.95%); 86,481 uncached input tokens; 13,991 output tokens; 2,846,328 total tokens. The 2,671 reasoning output tokens are part of output, not additional tokens. |
| Cost | Credits unavailable in the local log; estimated USD cost unavailable. No dollar estimate is inferred from the Business plan. |
| Human steering | One user task message and no subsequent user messages or redirects in the session log. The agent made the implementation and testing corrections itself. |
| Harness configuration | Commit `93fcb62` (`harness for iteration 1`) added `AGENTS.md`, the `cellix-architecture` skill and references, and architecture tests before this run. The session log shows the agent reading and applying that skill and completing its alignment map. |
| Baseline comparison | The baseline on `dn-oai-0-a-out` used 7,726,072 tokens and took 31m 52s; this engineered run used 2,846,328 tokens and took 7m 5s. The baseline concentrated the model, fixtures, search behavior, and composition in the application-services root and kept course routing and validation in the REST root. Applying the same review depth and rubric interpretation gives the baseline 66/100: Functional 5, Validation 5, Architecture 2, Security 3, neutral baseline Harness Effectiveness 3, Efficiency 1, Workflow 3, and Vendor Readiness 2. The engineered run scores 71/100: Functional 5, Validation 5, Architecture 3, Security 3, Harness Effectiveness 3, Efficiency 2, Workflow 3, and Vendor Readiness 2. It is substantially faster and more token-efficient and introduces domain, persistence, application-query, and REST feature boundaries. Its Cellix deviations still require moderate refactoring, and the added architecture guardrails did not detect them. Model differences mean the speed and token improvements cannot be attributed solely to harness engineering. |

## Rubric scores

| Category | Score | Weighted result | Evidence and rationale |
| --- | ---: | ---: | --- |
| Functional Correctness | 5/5 | 20/20 | Task Set A endpoint behavior and documentation are present; all 12 HTTP acceptance scenarios passed. The reported missing domain features are not specific enough to count as failed business acceptance criteria. |
| Test and Validation Performance | 5/5 | 15/15 | Focused, acceptance, full, lint, typecheck, build, and architecture checks passed in the execution session, and useful unit and HTTP acceptance coverage was added. The later architectural findings are scored under Architecture and Harness Effectiveness. Restricted review reruns fail only because that sandbox cannot bind localhost. |
| Architecture and Codebase Alignment | 3/5 | 9/15 | The run improved on the baseline by introducing domain, persistence, curried application-query, and REST feature boundaries and by reading through `readonlyDataSource`. Domain and persistence file trees, suffixes, contract ownership, application-service context API shape, factory injection, and context naming still need moderate refactoring against Cellix. |
| Security and Guardrail Compliance | 3/5 | 9/15 | No secret or unsafe feature code observed, but the lockfile is outside the stated write boundary and security scan evidence is unavailable. |
| Harness Engineering Effectiveness | 3/5 | 6/10 | The iteration-1 skill and architecture tests produced some improvement in responsibility separation, execution time, and token use, but the result is not dramatic: several Cellix conventions remain unmet and the architecture gate did not detect them. Model differences also prevent attributing all speed and token gains to the harness. |
| Context Token and Cost Efficiency | 2/5 | 4/10 | The working endpoint took 2,846,328 total tokens (96.95% of input cached), versus 7,726,072 tokens for the baseline, but still needs substantial architecture rework. Dollar cost is unknown; the token reduction is meaningful, but usage remains expensive for the quality delivered. |
| Developer Workflow Fit | 3/5 | 6/10 | The 7m 5s execution needed no user redirects, but post-run review uncovered several cross-layer issues requiring cleanup. It was easy to execute but not easy to accept or repeat without correction. |
| Operational and Vendor Readiness | 2/5 | 2/5 | Business plan is known, but enterprise approval, administrative controls, vendor terms, and procurement path are not documented; training use is plausible while production approval remains unclear. |

**Final weighted score:** 71/100, five points above the baseline's normalized 66/100 score. The engineered run is faster, uses fewer tokens, and separates more responsibilities than the baseline. The improvement is meaningful but limited because moderate Cellix refactoring remains and the added architecture guardrails did not detect the deviations. **Security hard rule:** not triggered. **Recommendation:** Remediate the Cellix structural deviations and write-boundary exception, then rerun architecture and acceptance validation. Complete security and vendor review evidence before considering pilot candidacy. The score uses known token counts without assuming a dollar cost.

## Cellix references and architectural decisions

| Responsibility | AgentCourses implementation | Cellix reference | Decision or deviation |
| --- | --- | --- | --- |
| Composition | `apps/api/src/index.ts`; `packages/axc/application-services/src/index.ts` | `/Volumes/files/src/cellixjs/apps/api/src/index.ts`; `/Volumes/files/src/cellixjs/packages/ocom/application-services/src/index.ts` | API registers the handler, but the application-service factory constructs the concrete data source instead of receiving a factory through context. |
| Domain | `packages/axc/domain/src/course.ts`; `packages/axc/domain/src/index.ts` | `/Volumes/files/src/cellixjs/packages/ocom/domain/src/domain/contexts/community/community/index.ts`; `/Volumes/files/src/cellixjs/packages/ocom/domain/src/domain/contexts/index.ts` | Course is flattened at package root; the read repository contract is misplaced in domain. A read-only projection need not become an aggregate, but applicable context/export structure is missing. |
| Application query | `packages/axc/application-services/src/contexts/catalog/course/list.ts` | `/Volumes/files/src/cellixjs/packages/ocom/application-services/src/contexts/user/staff-role/list.ts` | DataSources-first curried query uses `readonlyDataSource`. |
| Application context | `packages/axc/application-services/src/contexts/catalog/index.ts` | `/Volumes/files/src/cellixjs/packages/ocom/application-services/src/contexts/community/index.ts` | Missing `CourseApi` import alias and explicit entity/context service interfaces; lowercase root `catalog` breaks consistent `Catalog` naming. |
| Persistence | `packages/axc/persistence/src/datasources/readonly/course.ts`; `packages/axc/persistence/src/index.ts` | `/Volumes/files/src/cellixjs/packages/ocom/persistence/src/datasources/readonly/community/community/community.read-repository.ts`; `/Volumes/files/src/cellixjs/packages/ocom/persistence/src/datasources/readonly/community/community/index.ts` | Fixture data is behind a repository, but contract, file suffix, and context/entity composition differ from Cellix. |
| Transport | `packages/axc/rest/src/features/courses.ts` | `/Volumes/files/src/cellixjs/packages/ocom/rest/src/index.ts` | Hono-specific validation and error mapping stay at the REST boundary. |
| Verification | `packages/axc/application-services/src/contexts/catalog/course/list.test.ts`; `packages/axc-verification/acceptance-api/src/features/courses.feature` | `/Volumes/files/src/cellixjs/packages/ocom/application-services/src/contexts/user/staff-role/list.test.ts` | Unit tests and acceptance scenarios passed in the execution session with localhost access. |

The deviations above require coordinated changes to domain exports, read-repository ownership, persistence composition, application-service interfaces, context naming, and API wiring. The exact domain behavior the reviewer describes as missing needs a file-by-file requirement list before it can be scored as a functional defect. No mutation aggregate, unit of work, or value objects are assumed necessary solely for this read-only Task Set A feature.

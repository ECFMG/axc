# Evaluation scoring details — harness engineering iteration 2

Evaluated on 2026-10-06 against `evaluation-category-scoring-rubric.md`, Task Set A, the staged implementation diff on `dn-oai-2-a-out`, the local Cellix source, and fresh validation runs. Execution metadata comes from Codex session `01a1130a-432d-79b0-97a5-b596e6833409` and its associated guardian session. The resulting weighted score is **83/100**.

## Findings

1. **The requested behavior is complete.** The output defines all required course fields, contains 12 mixed fixtures, registers `GET /api/courses`, implements case-insensitive keyword and tag matching, modality/status filters, pagination, all three sort values, consistent `400` errors, no-match behavior, and endpoint documentation.
2. **The iteration-2 harness corrected the material Cellix deviations found in iteration 1.** `Catalog` is consistent across layers; the read contract and fixture-backed implementation live under persistence's context/entity readonly data source; application services use a DataSources-first curried query; the API composition root creates and injects the factory; context composition aliases `CourseApi` and declares explicit entity/context service interfaces; REST validation stays in a feature module.
3. **A read-only projection is appropriately lightweight.** Task Set A has no mutation behavior or domain invariant beyond stable course types. An aggregate, mutation repository, unit of work, value objects, and domain behavior tests were intentionally omitted. Adding them would create unused layers not required by the closest Cellix query pattern.
4. **Validation is clean when the acceptance host can bind localhost.** The initial review run inside the restricted sandbox could not bind port 7071 and broke at server startup. The same `pnpm run test` command passed all 12 scenarios after local port access was granted, proving the earlier result was environmental rather than a product defect.
5. **Security and boundary evidence still requires remediation.** The staged feature contains no detected secret-like values and adds no third-party package versions. However, the repository's pre-commit `verify` pipeline stopped on `pnpm audit`, which reported 8 dependency findings (3 moderate, 3 high with 2 ignored, and 2 critical). The audit findings appear inherited because the lockfile diff changes workspace links/resolution metadata rather than third-party versions, but they remain unresolved repository findings. The root `pnpm-lock.yaml` change is also outside Task Set A's explicit write boundary, even though it records the required workspace relationships. Snyk did not run after audit failed.
6. **The requested feature was delivered as a staged patch, not a commit.** The task did not require a commit. The run nevertheless attempted one; the security hook blocked it, and an approval request to bypass the hook was rejected. The staged implementation remained intact.

## Validation evidence

| Check | Result |
| --- | --- |
| Focused application-service tests | Passed: 5 course-search tests; package total 4 files and 14 tests, no type errors. |
| `pnpm run lint` | Passed: 215 files checked, no fixes. |
| `pnpm run typecheck` | Passed: 23 / 23 Turbo tasks. |
| `pnpm run build` | Passed: 18 / 18 Turbo tasks, including docs and API deployment artifact. |
| `pnpm run test:arch` | Passed: 31 tests (21 AgentCourses and 10 Cellix), 17 / 17 Turbo tasks. |
| `pnpm run test` | Passed with localhost access: 554 unit tests, 12 acceptance scenarios, and 27 / 27 Turbo tasks. |
| Acceptance scenarios | Passed: 11 course scenarios and the existing healthcheck; 0 failed. |
| Diff checks | `git diff --cached --check` passed; no secret-like values detected by targeted staged-diff search. |
| Repository audit | Failed: 8 findings — 3 moderate, 3 high (2 ignored), and 2 critical. The diff adds workspace dependencies only; no new third-party version was introduced. |
| Snyk | Not run because the pre-commit verification stopped at `pnpm audit`. |

Passing Turbo results include cache hits. The restricted first acceptance attempt is not counted as a product failure because its local socket operation was denied; the authorized rerun passed unchanged code.

## Execution-session and harness evidence

| Field | Evidence |
| --- | --- |
| Model and plan | `gpt-6-sol` at medium reasoning; Business (`self_serve_business_prolite`), authenticated through ChatGPT. |
| Run duration | 2026-10-06 17:07:26.448 to 17:15:58.058 EDT: 8m 32s. |
| Token usage | Primary plus associated guardian: 4,225,314 input tokens, 4,077,568 cached input tokens (96.50%), 147,746 uncached input tokens, 19,882 output tokens, and 4,245,196 total tokens. The 4,371 reasoning tokens are included in output. |
| Cost | Credits and dollar cost unavailable. No price estimate is inferred from the Business plan. |
| Human steering | One task message and no later user redirects. The denied hook-bypass escalation was an automatic approval decision, not a human redirect. |
| Harness configuration | Commit `9711332` strengthened the Cellix skill and repository instructions around factory injection, read-side ownership, exact context/entity structure and suffixes, explicit service interfaces, consistent naming, and completion review. |
| Iteration-1 comparison | Iteration 1 scored 71/100, used 2,846,328 tokens, and took 7m 5s. Iteration 2 removes the prior moderate architecture defects and improves repeatability, but uses about 49% more tokens and takes about 20% longer. |
| Baseline comparison | The baseline used 7,726,072 tokens and took 31m 52s. Iteration 2 remains about 45% lower in token use and about 73% faster while producing a substantially better-aligned result. Model differences prevent attributing all efficiency changes solely to harness configuration. |

## Rubric scores

| Category | Score | Weighted result | Evidence and rationale |
| --- | ---: | ---: | --- |
| Functional Correctness | 5/5 | 20/20 | All Task Set A requirements and all 12 acceptance criteria are implemented. The unchanged output passed every HTTP scenario, including combined filters, pagination/sorting, validation, and no matches. |
| Test and Validation Performance | 5/5 | 15/15 | Focused tests, the full unit suite, acceptance scenarios, architecture checks, lint, typecheck, and build all pass. Added tests are useful at application-service and composed HTTP levels. |
| Architecture and Codebase Alignment | 5/5 | 15/15 | The implementation closely follows the selected Cellix composition, context-service, curried query, readonly data-source, read-repository, naming, suffix, export, and transport patterns. The omitted mutation/domain layers do not apply to this read-only feature. |
| Security and Guardrail Compliance | 3/5 | 9/15 | Feature code shows no secret or unsafe behavior and adds no external dependency, but the root lockfile is outside the explicit write boundary and repository audit reports unresolved high/critical findings. The harness correctly did not bypass the security hook without approval. |
| Harness Engineering Effectiveness | 4/5 | 8/10 | Iteration 2 clearly improves architecture quality and repeatability by resolving the concrete iteration-1 deviations. It does not earn 5 because token use and elapsed time regressed and the boundary/audit issues remain. |
| Context Token and Cost Efficiency | 3/5 | 6/10 | The strong result costs 4,245,196 tokens: materially better than the 7,726,072-token baseline but worse than iteration 1's 2,846,328. Dollar cost is unavailable, so efficiency is acceptable rather than exceptional. |
| Developer Workflow Fit | 4/5 | 8/10 | No user steering was required, the feature and full gate completed quickly, and the output is easy to review. Minor friction came from an unnecessary commit attempt and an inherited audit failure that left the patch staged. |
| Operational and Vendor Readiness | 2/5 | 2/5 | The Business plan is known, but enterprise approval, administrative controls, vendor terms, and procurement evidence are not documented; production approval remains unclear. |

**Final weighted score:** 83/100. **Security hard rule:** not triggered. **Recommendation:** Remediate the repository audit findings or document approved exceptions, and resolve or explicitly approve the root lockfile boundary exception. After those items, this implementation quality is suitable for pilot reconsideration.

## Cellix alignment review

### References inspected

- `/Volumes/files/src/cellixjs/apps/api/src/index.ts`
- `/Volumes/files/src/cellixjs/packages/ocom/application-services/src/index.ts`
- `/Volumes/files/src/cellixjs/packages/ocom/application-services/src/contexts/service/index.ts`
- `/Volumes/files/src/cellixjs/packages/ocom/application-services/src/contexts/community/index.ts`
- `/Volumes/files/src/cellixjs/packages/ocom/application-services/src/contexts/user/end-user/query-by-name.ts`
- `/Volumes/files/src/cellixjs/packages/ocom/persistence/src/datasources/index.ts`
- `/Volumes/files/src/cellixjs/packages/ocom/persistence/src/datasources/readonly/index.ts`
- `/Volumes/files/src/cellixjs/packages/ocom/persistence/src/datasources/readonly/community/community/community.read-repository.ts`
- `/Volumes/files/src/cellixjs/packages/ocom/persistence/src/datasources/readonly/community/community/community.data.ts`
- `/Volumes/files/src/cellixjs/packages/ocom/persistence/src/datasources/readonly/community/community/index.ts`

The closest analog is the Cellix readonly query flow: API composition injects `DataSourcesFactory`; application contexts expose explicit named services; an operation accepts `DataSources` before its query; and the implementation resolves a context/entity `*ReadRepo` from `readonlyDataSource`.

### Responsibility map

| Responsibility | AgentCourses destination | Cellix reference | Decision or justified deviation |
| --- | --- | --- | --- |
| Composition | `apps/api/src/index.ts`; `packages/axc/application-services/src/index.ts` | Cellix API and application-service roots | API constructs `createDataSourcesFactory()` and injects it through `ApiContext`; the application host does not construct persistence. |
| Domain model | `packages/axc/domain/src/domain/contexts/catalog/course/course.ts` and context exports | Cellix domain context/entity tree | Stable course types use the same context/entity export depth. Aggregate, value objects, mutation repository, and UoW are omitted because the task is read-only and has no mutation invariant. |
| Application operation | `packages/axc/application-services/src/contexts/catalog/course/search.ts` | Cellix `query-by-name.ts` | DataSources-first curried query delegates to `readonlyDataSource`. |
| Application composition | `packages/axc/application-services/src/contexts/catalog/course/index.ts`; `contexts/catalog/index.ts` | Cellix service/community context indexes | Explicit `CourseApplicationService` and `CatalogContextApplicationService`; imported entity API is aliased as `CourseApi`. |
| Read repository | `packages/axc/persistence/src/datasources/readonly/catalog/course/course.read-repository.ts` | Cellix community read repository | Read contract and fixture-backed implementation use the expected suffix and live in persistence, not domain. |
| Fixture state | `packages/axc/persistence/src/datasources/readonly/catalog/course/course.data.ts` | Cellix `community.data.ts` | Twelve immutable fixture records are hidden behind the read-repository boundary. |
| Data-source composition | `packages/axc/persistence/src/datasources/**/index.ts` | Cellix persistence data-source indexes | `Catalog.Course.CourseReadRepo` is composed through the readonly data source and exposed by a factory. No domain data source is needed for a read-only feature. |
| Transport | `packages/axc/rest/src/features/courses.ts`; registration in `rest/src/index.ts` | Cellix thin REST root and feature-oriented handlers | Hono-specific parsing, validation, and HTTP error mapping remain at the transport boundary; the route calls application services. |
| Verification | application-service search tests, Cucumber course feature, architecture suite | Cellix unit/feature and architecture patterns | Behavior is proven both below transport and through the composed Azure Functions host. No domain test is needed for type-only domain declarations. |

### Dependency and placement decision

Domain has no dependency on persistence, application services, transport, or infrastructure. Persistence depends on domain types. Application services depend on persistence contracts. REST depends on application services and does not access persistence. The API is the composition root and injects the concrete data-source factory. Queries use only `readonlyDataSource`; no mutation transaction is applicable.

### Deviations

1. **In-memory fixture instead of a database adapter:** `packages/axc/persistence/src/datasources/readonly/catalog/course/` uses a static dataset because Task Set A requires service-free fixture data. The repository boundary makes a later adapter replacement local to persistence.
2. **No passport-aware factory method:** `DataSourcesFactory` exposes only `withSystemPassport()` because this anonymous sample endpoint has no authentication or authorization requirement. Adding `withPassport` later would extend the factory contract without moving application behavior.
3. **Root lockfile change:** `pnpm-lock.yaml` records the new workspace dependency edges but lies outside the fixed task write boundary. This is a guardrail exception requiring reviewer approval, not a Cellix layering deviation.

No unexplained Cellix structural or dependency-direction deviation was found.

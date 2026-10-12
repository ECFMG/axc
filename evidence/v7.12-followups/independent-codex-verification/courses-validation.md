# Course search validation

## Current validation: 2026-10-12

Revalidated the existing implementation in an isolated local checkout on branch `codex/task-set-a-evaluation-2026-10-12`, using Node 24.21.0 and pnpm 11.9.0. No endpoint changes or new dependencies were needed. All A1–A11 requirements and A-AC1–A-AC12 acceptance criteria are satisfied by the implementation, tests, and documentation.

| Check | Result |
| --- | --- |
| `pnpm test --force` | Passed: 26 tasks, zero cache hits; 646 unit/integration tests and 3 HTTP acceptance scenarios passed. |
| `pnpm run lint` | Passed: 202 files checked. |
| `pnpm run build --force` | Passed: 18 tasks, zero cache hits; API bundle and documentation built. |
| `pnpm run typecheck` | Passed: 21 tasks. |
| `pnpm run test:arch` | Passed: 9 AXC and 10 shared architecture checks; 15 tasks successful. |

The first full-suite attempt was interrupted by the sandbox denying local socket access (`listen EPERM`). The successful rerun enabled local test servers and used the installed MongoDB binary with runtime downloads disabled. The existing acceptance harness generated test-only local settings in the isolated copy. No production configuration, authentication, dependencies, or vendored source was edited.

The run's logs and measured usage snapshot accompany its deliverables. Usage excludes work after the recorded snapshot and the final response; monetary cost and account plan were unavailable. The [evaluation run record](courses-evaluation-run-2026-10-12.md) distinguishes this verification from a fresh baseline implementation run. Dependency audits and Snyk were outside this local evaluation.

## Previous validation: 2026-10-08

Validated the existing Task Set A implementation (`d6153e2`) with Node 24.21.0 and the repository-declared pnpm 11.9.0. The checkout was clean before validation. No endpoint code changes or new dependencies were needed.

| Check | Result |
| --- | --- |
| `pnpm test --force` | Passed: all 26 tasks executed without cache, including MongoDB integration tests and Azure-host acceptance tests. |
| `pnpm run lint` | Passed: 202 files checked, no fixes applied. |
| `pnpm run build --force` | Passed: all 18 build tasks, including the API bundle and Docusaurus documentation. |
| `pnpm run typecheck` | Passed: all 21 tasks. |
| `pnpm run test:arch` | Passed: 9 AXC checks and 10 shared architecture checks; 15 tasks successful. |
| `git diff --check` | Passed. |

The course feature's 46 Hono route tests and three application-service tests pass. Route coverage includes default pagination, all searchable fields, case folding, every modality and status, exact tag matching, multiple filter combinations, all three sorts, pagination boundaries, validation failures, duplicate parameters, no matches, the health route, and authorization-header forwarding. The full application-service suite has 10 passing tests.

All three Cucumber scenarios passed against the local Azure Functions host: combined course filtering, the invalid page-size response, and the existing health check. Serenity generated its HTML report. The shared MongoDB suite passed all 165 tests using the installed local test binary. No test exclusions were added. Acceptance criterion A-AC10 is now verified by the full test command.

Validation outputs and this run's provider usage accounting are saved externally with the run artifacts. `usage.json` records Codex cumulative-counter differences and Ollama call counters separately from the planning estimate. No Ollama inference calls or subagents were used. The original final assistant response must be recovered from its completed turn before that usage record can be marked complete. Token totals are not monetary charges or evidence of savings.

## Previous validation

The 2026-09-29 run was marked NOT PASSED because its full suite could not access a MongoDB test binary and its environment lacked the Azure Functions host and Java runtime. Those earlier results are superseded by the successful local rerun above; no production configuration or vendored Cellix source changes were required to resolve them.

## Reproduction

With Node 24+, pnpm 11.9.0, the existing lockfile dependencies, a local MongoDB test binary, Azure Functions Core Tools v4, and a Java runtime, run the commands in the table from the repository root. The course fixtures require no production data or application credentials. The existing acceptance harness creates its generated local test settings and reports.

The endpoint remains a read-only catalog of twelve immutable fixtures. Full verification workflows involving dependency audits, Snyk, or external network analysis were outside this local task run.

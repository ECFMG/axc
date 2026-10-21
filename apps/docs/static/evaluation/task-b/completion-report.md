# Task B completion

Completed Task B, including its required course-search prerequisite, on the user-linked `ECFMG/axc` branch `df-oai-4-b-out`, starting from commit `9c890d75784ea7a18fe0c192cfacfdcdaa1ef111`. The original implementation turn made no commits or pushes. Under the subsequent explicit publication request, Task B code, the root evaluation record, and supporting findings are published to the linked branch. Human operator: Dane Fortun.

## Deliverables

- `axc-task-b-source.zip`: complete source snapshot, excluding dependencies, generated build output, local settings, and Git metadata. Extract and run the repository's normal frozen dependency installation.
- `changes.patch`: all 15 changed/new files relative to the exact baseline. Verified to apply cleanly to that baseline.
- `deliverables.json`: source commit, changed-file inventory, hashes, and write-boundary checks.
- `evaluation-run-record.md`: completed evaluation record; the subsequent explicit publication request authorizes updating the root repository record.
- `usage.json`: authoritative recorded native Codex usage, including separate investigator and reviewer turns.
- `recover-usage.py`: recovers original task counters after its final response is logged. It excludes subsequent follow-up turns.
- Validation logs beside this report.

## Requirements satisfied

Course-search prerequisite required by Task B (B1/B-AC1): the referenced search behavior is implemented and validated. The API returns 12 mixed course fixtures with the required fields, case-insensitive title/summary/tag search, AND filters, stable ascending sorting, pagination defaults and limits, consistent 400 errors, and empty-result metadata.

Task B: all B1–B17 implemented and all 15 Task B acceptance criteria covered. Four enrollment endpoints provide creation, retrieval, filtering, and status changes. Requests require an existing active course, valid email syntax, and a 20–500-character justification. New requests are pending. Pending/approved duplicates are rejected. All four allowed transitions work; other transitions return 409. Rejection requires a reason. Creation and each successful change append immutable historical records with timestamps and operator identifiers. Invalid operations leave stored records unchanged.

These are implementation/validation mappings, not an independently awarded rubric score.

API documentation is in `apps/docs/docs/api/courses.md` and `apps/docs/docs/api/enrollment-requests.md`, with working documentation navigation.

## Implementation and scope

The archive supplied in the request contains OpenAI harness tooling, fixed Task A requirements, and an independent course oracle; it does not contain the application source. After the user's branch clarification, the linked GitHub branch became the implementation baseline. Both Task B documents remain unchanged. Their referenced Task A specification was read from the supplied archive.

Course fixtures, search implementation, query parsing, and regression tests were reused from the inspected earlier local Task A implementation and adapted into the linked baseline. Enrollment functionality is new. This is not a fresh-generation or controlled harness-comparison trial. No savings or benchmark claims are made. The harness controller was not dispatched; its unchanged course acceptance oracle was run independently.

The existing application-services pattern is retained. Separate logical modules hold the enrollment model/rules/validation, in-memory repository, application service, and copy mapping. This avoids new workspace dependencies and root lockfile edits outside the allowed write boundary. Storage is owned by the application factory, so Azure's per-request handler creation does not reset requests. Repository copies prevent callers from changing stored records or audit history. All 15 changed files fall within allowed paths. No dependencies or vendored Cellix files changed.

The requested Code Simplification pass remained within changed code; no unrelated refactor was needed. A Cavecrew investigator and reviewer checked integration and correctness. Email-validation edge cases and a stale documentation link found during review were corrected and validated.

## Final validation

| Command/check | Result | Evidence |
| --- | --- | --- |
| `pnpm install --frozen-lockfile --ignore-scripts` | Passed, pnpm 11.11.0; existing lockfile unchanged | `dependency-install.log` |
| `pnpm test` | Passed: 25/25 workspace tasks, existing tests, 110 feature tests, existing Azure-host Cucumber health scenario | `test.log` |
| Feature test breakdown | 46 course tests and 64 enrollment tests passed | `test.log` |
| `pnpm run lint` | Passed; 0 errors, 16 informational suggestions | `lint.log` |
| `pnpm run build` | Passed: 18/18 workspace tasks | `build.log` |
| `pnpm --filter @apps/docs build` | Explicit uncached docs build passed, including new API pages and links | `docs-build.log` |
| `pnpm run typecheck` | Passed: 21/21 tasks | `typecheck.log` |
| `pnpm run test:arch` | Passed: 9 architecture tests; 15/15 workspace tasks | `architecture.log` |
| `pnpm --filter @axc-verification/acceptance-api test:host` | Passed: 64 enrollment checks, including 62 through real Azure Functions HTTP and 2 local service/error checks | `host-enrollment-tests.log` |
| Supplied `course_acceptance.mjs` | Passed: 29/29 independent checks in memory | `course-oracle.log` |
| Supplied `course_acceptance.mjs --host` | Passed: 29/29 independent checks through Azure Functions HTTP | `host-course-oracle.log` |
| `git diff --check` | Passed | `diff-check.log` |
| Patch application and ZIP integrity | Passed against exact baseline | `patch-check.log`, `deliverables.json` |

The root suite runs feature tests through the existing acceptance task, after the API build dependency. Standalone feature tests are available as `pnpm --filter @axc-verification/acceptance-api test:workflow` after building. Host validation requires the existing Azure Functions Core Tools installation. Test-generated ignored local settings are not included in the source archive.

Initial sandboxed baseline runs failed because local listening ports were blocked (`listen EPERM`). Validation passed with permission to run local test servers; no source workaround or weakened test was used. Logs named `baseline-*` describe the initially inspected older checkout; logs named `linked-baseline-*` describe the linked branch before implementation. Final results are the logs listed above. The documentation build's optional update-check warning did not affect compilation.

## Assumptions, limitations, and blockers

No remaining implementation or validation blockers. This is a sample, process-local in-memory store: restarts clear requests, and multiple workers do not share state or uniqueness guarantees. A durable store with an atomic uniqueness constraint is the documented upgrade path. Email normalization trims and lowercases addresses; validation supports common unquoted ASCII addresses, without deliverability checks. Justification length uses JavaScript string units after trimming. `changedBy` is a supplied identifier under existing sample conventions, not authenticated identity.

## Usage and estimate

Projected estimate: **2,000,000 total tokens**, assuming approximately 25–40 calls with 45,000–65,000 input tokens per call and 10,000–20,000 output tokens overall. This estimate was recorded after initial document/archive inspection and before implementation; the request to record the estimate before all substantive inspection was not met. Actual repeated context and separate investigator/reviewer work exceeded those assumptions. The projection is retained unchanged and never substituted for measured usage.

Actual usage is derived from native JSONL `token_count.info.total_token_usage`: ending cumulative counters minus starting counters for each original turn. Cumulative snapshots are not summed. Cached input is included in input; reasoning output is included in output. Subagent deltas are separately recorded and included once in the aggregate. Source logs, original turn IDs, timestamps, baseline reconstruction, and missing usage are in `usage.json`.

The original Task B final-response counters have now been recovered. Accounting is complete for the original main turn and both subagent turns. This follow-up conversation is excluded. Actual billing remains unavailable. A later estimate using the operator-supplied rate card is recorded separately in cost-estimate.json: $1.5073464, approximately $1.51. Original token counters remain unchanged; publication follow-ups are excluded.

<!-- USAGE_SNAPSHOT -->

Original Task B usage complete through **2026-10-21T13:08:07.997Z** (2026-10-21 09:08:07 EDT), including its final assistant response. This follow-up turn is excluded.

| Actor | Input | Cached input (included) | Output | Reasoning output (included) | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Main | 5,345,268 | 5,216,768 | 35,185 | 10,109 | 5,380,453 |
| Investigator + reviewer | 1,711,667 | 1,627,776 | 4,626 | 355 | 1,716,293 |
| Aggregate | 7,056,935 | 6,844,544 | 39,811 | 10,464 | 7,096,746 |

## Final rubric publication

Human operator: Dane Fortun. Retrospective assistant self-assessment: 23/25 across five assessed categories. Efficiency remains unscored because the supplied policy requires a matched comparison; overall /30 remains unassigned. See rubric-assessment.json and the root evaluation record for evidence and rationale.

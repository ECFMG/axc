### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field | Value |
| --- | --- |
| Team | Cursor |
| Developer / Operator | Ethan Nguyen |
| Reviewer | (leave blank for now) |
| Harness | Cursor |
| Model | Grok 4.7 high-fast |
| License / Plan | Cursor Team Plan |
| Codebase | ECFMG/axc |
| Task Set | B |
| Run Type | Harness Engineering Iteration 3 |
| Harness Engineering Used | Repository guidance on `en-cur-3` @ `b1ed21c`: `AGENTS.md`, the `axc-development` skill, architecture and security rules, the one-pass rule, the narrowed public API test rule, `scripts/agent-check.mjs`, Ponytail, Caveman, and architecture tests for the concrete storage boundary. |
| Config / Diff Notes | Usage is the Grok 4.7 high-fast dashboard delta. Before: cache read 37,538,816; cache write 0; input 1,937,030; output 628,139; total 40,103,985. After: cache read 42,175,104; cache write 0; input 2,150,481; output 708,033; total 45,033,618. The published baseline `en-cur-0-a-out` started from `32ca4a0`. This run started clean from harness commit `b1ed21c`, not from `en-cur-3-a-out`. The transcript has one user message and 171 tool calls, including 71 file reads. No human redirected the run. |
| Branch / Commit | en-cur-3-b-out @ 79b7432. Configuration: en-cur-3 @ b1ed21c. |
| Requirements Completed / Attempted | 17 / 17 (B1–B17). `GET /api/courses` is included. Enrollment requests support create, get by id, filtered list, and status update. Creation requires an active course, a valid email, and a 20–500 character justification. New requests start `pending`. Duplicate pending or approved requests are rejected. Valid transitions are pending to approved, rejected, or cancelled, and approved to cancelled. Rejection requires a reason. Creation and status changes append `statusHistory`. |
| Acceptance Criteria Passed / Total | 15 / 15 (B-AC1–B-AC15), from the implementation, package tests, and acceptance scenarios. HTTP acceptance covers one combined course search, one invalid `pageSize`, and creation plus retrieval of one pending enrollment request. The other enrollment rules are covered by package tests. |
| Tests Passed / Failed | The independent `pnpm run verify` passed, and the publication hook passed again. Acceptance: 3 catalog scenarios and 1 healthcheck passed, 0 failed. `@axc/application-services` 34 passed, including 8 course cases and 7 enrollment cases. `@axc/persistence` 4 passed. Architecture tests 11 passed. |
| Static Analysis / Security Findings | Biome, TypeScript, Knip, e18e, and architecture tests passed. `pnpm audit --audit-level=high` passed. Snyk reported 0 open issues and 10 ignored. Application services and REST do not import `@axc/persistence`. `apps/api` injects the in-memory course and enrollment repositories. New lockfile entries are workspace links plus the existing Vitest catalog packages used to test `@axc/persistence`. `@axc/service-mongoose` and `packages/cellix/**` were not changed. |
| Input Tokens | 213,451 |
| Cached Tokens | 4,636,288 cache read; 0 cache write |
| Output Tokens | 79,894 |
| Total Tokens or Credits Used | 4,929,633 |
| Estimated Cost | About $6.45 at Cursor's published Grok 4.7 Fast short-context list price ($4 input, $1 cache read, $12 output per 1M tokens). The dashboard did not show a cost. Long-context Fast rates would put the same tokens near $9.67. At the other harness's published rates ($2 uncached input, $0.10 cached input, $10 output per 1M), this token mix is about $1.69. That figure is a comparison, not the billed cost. The Team plan may cover this inside included usage. |
| Elapsed Time | 15m 58s |
| Number of Human Interventions / Redirects | 0 |
| Reviewer Notes | (leave blank for now) |
| Final Rubric Score | (leave blank for now) |
| Recommendation | Continue / Remediate / Stop / Candidate for Pilot |

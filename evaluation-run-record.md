### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field | Value |
| --- | --- |
| Team | Cursor |
| Developer / Operator | Ethan Nguyen |
| Reviewer | Ethan Nguyen |
| Harness | Cursor |
| Model | Grok 4.7 high-fast |
| License / Plan | Cursor Team Plan |
| Codebase | ECFMG/axc |
| Task Set | A |
| Run Type | Harness Engineering Iteration 3 |
| Harness Engineering Used | Repository guidance on `en-cur-3` @ `b1ed21c`: `AGENTS.md`, the `axc-development` skill, architecture and security rules, the one-pass rule, the narrowed public API test rule, `scripts/agent-check.mjs`, Ponytail, Caveman, and architecture tests for the concrete storage boundary. |
| Config / Diff Notes | Usage is the Grok 4.7 high-fast dashboard delta for the clean retry. Before: cache read 35,040,896; cache write 0; input 1,744,075; output 571,085; total 37,356,056. After: cache read 37,538,816; cache write 0; input 1,937,030; output 628,139; total 40,103,985. The published baseline `en-cur-0-a-out` started from `32ca4a0`. This run started from harness commit `b1ed21c`. An earlier Iteration 3 attempt was stashed as "iteration 3 task A first attempt" after a sandbox `pnpm install` abort and is not part of this branch. The transcript has 121 tool calls, including 59 file reads. The agent ran `pnpm install` once, checked commands through `scripts/agent-check.mjs`, edited after failed checks, and its last `pnpm run verify` passed. No human redirected those edits. |
| Branch / Commit | en-cur-3-a-out @ e482bd8. Configuration: en-cur-3 @ b1ed21c. |
| Requirements Completed / Attempted | 11 / 11 (A1–A11). `GET /api/courses` implements keyword, modality, status, and tag filters, default pagination (`page` 1, `pageSize` 10, max 50), sort (`title`, `createdAt`, `updatedAt`), HTTP 400 `INVALID_QUERY_PARAMETER`, a 12-course fixture injected from `apps/api`, package and acceptance tests, and course documentation. |
| Acceptance Criteria Passed / Total | 12 / 12 (A-AC1–A-AC12), from the implementation, package tests, and course acceptance scenarios. |
| Tests Passed / Failed | The publication `pnpm run verify` passed. Acceptance: 3 course scenarios and 1 healthcheck passed, 0 failed. `@axc/application-services` 30 passed, including 16 course cases. Architecture tests 11 passed. This run has no `@axc/rest` course test file; HTTP coverage is the 3 acceptance scenarios. |
| Static Analysis / Security Findings | Biome, TypeScript, Knip, e18e, and architecture tests passed in the publication verification. `pnpm audit --audit-level=high` passed. Snyk reported 0 open issues and 10 ignored. Application services and REST do not import `@axc/persistence`. `apps/api` injects the catalog from `@axc/persistence`. `@axc/service-mongoose` and `packages/cellix/**` were not changed. |
| Input Tokens | 192,955 |
| Cached Tokens | 2,497,920 cache read; 0 cache write |
| Output Tokens | 57,054 |
| Total Tokens or Credits Used | 2,747,929 |
| Estimated Cost | About $3.95 at Cursor's published Grok 4.7 Fast short-context list price ($4 input, $1 cache read, $12 output per 1M tokens). The dashboard did not show a cost. Long-context Fast rates would put the same tokens near $5.93. At the other harness's published rates ($2 uncached input, $0.10 cached input, $10 output per 1M), this token mix is about $1.21. That figure is a comparison, not the billed cost. The Team plan may cover this inside included usage. |
| Elapsed Time | 11m 40s |
| Number of Human Interventions / Redirects | 0 |
| Reviewer Notes | Strict SRD score added October 20, 2026. The evidence rows are unchanged. evaluation-run-record-unscored.md keeps the original blank review. Functional correctness 20/20. Tests and validation 12/15: verify passed and package tests cover the required cases. HTTP acceptance is only three scenarios, so the HTTP contract is not fully proven. Architecture 15/15. Security 12/15: 0 open findings and 10 ignored, including highs. Harness effectiveness 6/10: tokens fell 3.0% and time fell 11.7% from Iteration 2. That is some improvement, and it is not dramatic. Token and cost efficiency 8/10: 2,747,929 tokens, about $3.95, and 11m 40s. Close to Iteration 2, not a new low. Developer workflow 8/10: 0 interventions, 121 tool calls, and one install inside the run. Operational readiness 2/5. Total 83/100. |
| Final Rubric Score | 83/100 |
| Recommendation | Continue |

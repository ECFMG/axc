### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. This copy preserves the published record before the October 20, 2026 strict review. Reviewer, reviewer notes, rubric score, and recommendation stay blank. 

| Field | Value |
| --- | --- |
| Team | Cursor |
| Developer / Operator | Ethan Nguyen |
| Reviewer | (leave blank for now) |
| Harness | Cursor |
| Model | Grok 4.7 high-fast |
| License / Plan | Cursor Team Plan |
| Codebase | ECFMG/axc |
| Task Set | A |
| Run Type | Harness Engineering Iteration 2 |
| Harness Engineering Used | Repository guidance on `en-cur-2` @ `f125aa0`: `AGENTS.md`, the `axc-development` skill, architecture and security rules, the one-pass rule, the public API test rule, Ponytail, Caveman, and architecture tests for the concrete storage boundary. |
| Config / Diff Notes | Usage is the Grok 4.7 high-fast dashboard delta. Before: cache read 29,479,168; cache write 0; input 1,435,153; output 432,571; total 31,346,892. After: cache read 32,069,504; cache write 0; input 1,612,649; output 498,852; total 34,181,005. The published baseline `en-cur-0-a-out` started from `32ca4a0`. This run started from harness commit `f125aa0` (`17ba3ae`, the qs pin `f4cf0d8`, and the Iteration 2 harness commits). During the run, two new application-service assertions expected a different title order. The agent corrected those expectations and the matching acceptance scenario, reran `@axc/application-services`, then ran `pnpm run verify` once. No human redirected that correction. |
| Branch / Commit | en-cur-2-a-out @ 5dceac5. Configuration: en-cur-2 @ f125aa0. |
| Requirements Completed / Attempted | 11 / 11 (A1–A11). `GET /api/courses` implements keyword, modality, status, and tag filters, default pagination (`page` 1, `pageSize` 10, max 50), sort (`title`, `createdAt`, `updatedAt`), HTTP 400 `INVALID_QUERY_PARAMETER`, a 13-course fixture injected from `apps/api`, package and acceptance tests, and course documentation. |
| Acceptance Criteria Passed / Total | 12 / 12 (A-AC1–A-AC12), from the implementation, package tests, and course acceptance scenarios. |
| Tests Passed / Failed | The agent's final `pnpm run verify` passed. Acceptance: 14 course scenarios and 1 healthcheck passed, 0 failed. `@axc/application-services` 30 passed, including 13 course cases. `@axc/rest` 8 passed, including 4 course cases. Architecture tests 11 passed. The first targeted application-service run had 2 failed and 28 passed; those two expectations were corrected before the final verification. |
| Static Analysis / Security Findings | Biome, TypeScript, Knip, e18e, and architecture tests passed in the final verification. `pnpm audit --audit-level=high` passed. Snyk reported 0 open issues and 10 ignored. Application services and REST do not import `@axc/persistence`. `@axc/service-mongoose` and `packages/cellix/**` were not changed. |
| Input Tokens | 177,496 |
| Cached Tokens | 2,590,336 cache read; 0 cache write |
| Output Tokens | 66,281 |
| Total Tokens or Credits Used | 2,834,113 |
| Estimated Cost | About $4.10 at Cursor's published Grok 4.7 Fast short-context list price ($4 input, $1 cache read, $12 output per 1M tokens). The dashboard did not show a cost. Long-context Fast rates would put the same tokens near $6.14. The Team plan may cover this inside included usage. |
| Elapsed Time | 13m 13s |
| Number of Human Interventions / Redirects | 0 |
| Reviewer Notes | (leave blank for now) |
| Final Rubric Score | (leave blank for now) |
| Recommendation | Continue / Remediate / Stop / Candidate for Pilot |

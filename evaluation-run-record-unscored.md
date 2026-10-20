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
| Run Type | Harness Engineering Iteration 1 |
| Harness Engineering Used | Repository guidance on `en-cur-1` @ `17ba3ae`: `AGENTS.md`, the `axc-development` skill, architecture and security rules, the no-recheck rule, Ponytail, Caveman, and architecture tests for the concrete storage boundary. |
| Config / Diff Notes | This record is the Iteration 1 retry. The first attempt was discarded and is not scored here. Usage is the Grok 4.7 high-fast dashboard delta. Before: cache read 24,657,152; cache write 0; input 1,193,445; output 355,747; total 26,206,344. After: cache read 29,479,168; cache write 0; input 1,435,153; output 432,571; total 31,346,892. The published baseline `en-cur-0-a-out` started from `32ca4a0`. This run started from harness commit `17ba3ae` (`9c890d7`, the Hono pin `211bd12`, and the Iteration 1 harness commits). |
| Branch / Commit | en-cur-1-a-out @ eb8d782. Configuration: en-cur-1 @ 17ba3ae. |
| Requirements Completed / Attempted | 11 / 11 (A1–A11). `GET /api/courses` implements keyword, modality, status, and tag filters, default pagination (`page` 1, `pageSize` 10, max 50), sort (`title`, `createdAt`, `updatedAt`), HTTP 400 `INVALID_QUERY_PARAMETER`, a 12-course fixture injected from `apps/api`, REST tests, and course documentation. |
| Acceptance Criteria Passed / Total | 12 / 12 (A-AC1–A-AC12), from the implementation and REST unit tests. The acceptance suite does not cover course search. |
| Tests Passed / Failed | `pnpm run verify` exited 0 in 83s. Acceptance: 1 healthcheck passed, 0 failed. No course acceptance feature was added. `@axc/rest` 18 passed, including 9 course cases. Architecture tests 11 passed. Existing suite packages in the same run also passed, with 0 failures. |
| Static Analysis / Security Findings | Biome, TypeScript, Knip, e18e, and architecture tests passed. `pnpm audit --audit-level=high` passed. Snyk reported 0 open issues and 10 ignored. Application services and REST do not import `@axc/persistence`. `@axc/service-mongoose` and `packages/cellix/**` were not changed. |
| Input Tokens | 241,708 |
| Cached Tokens | 4,822,016 cache read; 0 cache write |
| Output Tokens | 76,824 |
| Total Tokens or Credits Used | 5,140,548 |
| Estimated Cost | N/A — dashboard did not show a cost |
| Elapsed Time | 25m 10s |
| Number of Human Interventions / Redirects | 0 |
| Reviewer Notes | (leave blank for now) |
| Final Rubric Score | (leave blank for now) |
| Recommendation | Continue / Remediate / Stop / Candidate for Pilot |

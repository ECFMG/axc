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
| Run Type | Baseline |
| Harness Engineering Used | None |
| Config / Diff Notes | Usage is the Grok 4.7 high-fast dashboard delta. Before: cache read 5,802,112; cache write 0; input 377,545; output 98,290; total 6,277,947. After: cache read 11,607,808; cache write 0; input 619,339; output 161,605; total 12,388,752. |
| Branch / Commit | en-cur-0-a-out |
| Requirements Completed / Attempted | 11 / 11 (A1–A11). `GET /api/courses` implements keyword, modality, status, and tag filters, default pagination (`page` 1, `pageSize` 10, max 50), sort (`title`, `createdAt`, `updatedAt`), HTTP 400 `INVALID_QUERY_PARAMETER`, a 12-course fixture, tests, and course documentation. |
| Acceptance Criteria Passed / Total | 12 / 12 (A-AC1–A-AC12), from the implementation plus the passing acceptance and unit tests. |
| Tests Passed / Failed | `pnpm run verify` exited 0. Acceptance: 8 course scenarios passed, 1 healthcheck passed, 0 failed. New unit tests: `@axc/rest` 14 passed, `@axc/application-services` 22 passed. Existing suite packages in the same run also passed, with 0 failures. |
| Static Analysis / Security Findings | Biome, TypeScript, Knip, e18e, and architecture tests passed. `pnpm audit --audit-level=high` passed. Snyk reported 0 open issues. The catalog is an in-memory fixture in `@axc/persistence`; `@axc/service-mongoose` was not changed. |
| Input Tokens | 241,794 |
| Cached Tokens | 5,805,696 cache read; 0 cache write |
| Output Tokens | 63,315 |
| Total Tokens or Credits Used | 6,110,805 |
| Estimated Cost | N/A — dashboard did not show a cost |
| Elapsed Time | 16m 44s |
| Number of Human Interventions / Redirects | 0 |
| Reviewer Notes | (leave blank for now) |
| Final Rubric Score | (leave blank for now) |
| Recommendation | Continue / Remediate / Stop / Candidate for Pilot |

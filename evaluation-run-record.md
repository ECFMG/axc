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
| Reviewer Notes | Strict SRD score added October 20, 2026. The evidence rows are unchanged. evaluation-run-record-unscored.md keeps the original blank review. Functional correctness 20/20. Tests and validation 15/15: 8 course acceptance scenarios, the unit tests, and verify passed. Architecture 9/15: the catalog fixture lives in @axc/persistence, and this run does not keep application services off that package. Iteration 1 had to correct that boundary. Security 12/15: 0 open findings, with known high advisories still ignored, so this is not a clean security result. Harness effectiveness 6/10: the SRD neutral score, because no harness iteration had been attempted. Token and cost efficiency 4/10: 6,110,805 tokens, 16m 44s, and a later list price of about $7.53. Expensive for one endpoint. Developer workflow 8/10: 0 interventions, with a long run. Operational readiness 2/5: training use is fine, and the production approval path is not established. Total 76/100. |
| Final Rubric Score | 76/100 |
| Recommendation | Continue |

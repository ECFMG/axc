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
| Task Set | B |
| Run Type | Harness Engineering Iteration 4 retry |
| Harness Engineering Used | One-pass discovery and validation; closed installed and vendored trees; one final verification budget; concise acceptance set |
| Config / Diff Notes | `en-cur-4` at `ab98b80`; 127 tool calls, 61 reads, 38 tool turns, first write turn 18; one affected check failed typecheck, its focused rerun passed, and one scored full verify passed |
| Branch / Commit | `en-cur-4-b-out` / implementation commit pending; harness `ab98b80` |
| Requirements Completed / Attempted | 17 / 17 (B1–B17) |
| Acceptance Criteria Passed / Total | 15 / 15 (B-AC1–B-AC15); HTTP acceptance uses one create success, one combined search, and one invalid search |
| Tests Passed / Failed | Independent wrapped `pnpm run verify`: PASS; application tests cover search, validation, duplicates, retrieval, filtering, transitions, history, and errors; acceptance has 3 feature scenarios plus existing healthcheck |
| Static Analysis / Security Findings | Verify, architecture, audit, and Snyk passed; 0 open Snyk findings; 10 ignored existing findings (6 high, 4 medium); no new dependency |
| Input Tokens | 156,464 |
| Cached Tokens | 3,595,392 read; 0 write |
| Output Tokens | 105,833 |
| Total Tokens or Credits Used | 3,857,689 |
| Estimated Cost | About $5.49 short-context list price; about $8.24 long-context estimate; about $1.73 at the comparison harness rates, not billed cost |
| Elapsed Time | 16m 59s |
| Number of Human Interventions / Redirects | 0 |
| Reviewer Notes | Strict SRD score added October 20, 2026. The evidence rows are unchanged. evaluation-run-record-unscored.md keeps the original blank review. Functional correctness 20/20: 17 of 17 requirements and 15 of 15 acceptance criteria. Tests and validation 12/15: verify passed and application tests cover the enrollment matrix. HTTP acceptance is three feature scenarios plus the healthcheck, so most rules are not proven over HTTP. Architecture 15/15. Security 12/15: 0 open findings and 10 ignored, including highs. Harness effectiveness 8/10: tokens fell 21.7% from Iteration 3 Task B. Time rose from 15m 58s to 16m 59s and output rose. Two areas improved, and speed did not. Token and cost efficiency 8/10: 3,857,689 tokens and about $5.49. Better than Iteration 3 Task B, and not a low result. Developer workflow 8/10: 0 interventions. One affected check failed typecheck before the passing verify. Operational readiness 2/5. Total 85/100. |
| Final Rubric Score | 85/100 |
| Recommendation | Continue |

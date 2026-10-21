### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field | Value |
| --- | --- |
| Team | Cursor |
| Developer / Operator | Frank Yang |
| Reviewer | (leave blank for now) |
| Harness | Cursor |
| Model | Grok 4.7(high) |
| License / Plan | Cursor Teams Premium |
| Codebase | ECFMG/axc |
| Task Set | A |
| Run Type | Harness Engineering Iteration 5 |
| Harness Engineering Used | Iteration 3 harness with one change: the "Data access" prose paragraph removed from AGENTS.md. The archunit rule (application-services may import only types from @axc/persistence) is KEPT and still enforced by pnpm run test:arch, so the layering is still required; only the written guidance on how to achieve it is gone. |
| Config / Diff Notes | fy-cur-5 = ffe2d4c on fy-cur-3 (e9eb45a); one change, 4 deletions (the Data access section). Hypothesis: isolate whether the data-access paragraph or the arch test drives the turn count (iter 1 without either was 3.80M; every run with them is ~5.7M). Prediction: <5.0M total (toward 4.5M), Architecture 5. Stop condition: >5.5M tokens or Architecture <5. Result: 8,570,744 total -> stop condition hit, change KILLED (worst run yet). Finding: the prose is NOT dead weight; it saves ~2.9M tokens (5.7M with it vs 8.57M without). Without guidance the agent still built correct layering (arch 20/0) but searched for and landed on a different pattern - constructor injection via a new 2nd argument to buildApplicationServicesFactory instead of putting the catalog on ApiContext - changing a public signature and editing health.test.ts to match. That search plausibly accounts for the 1h34m / 8.57M. Same prompt as baseline. |
| Branch / Commit | fy-cur-5-a-out @ af0c41e |
| Requirements Completed / Attempted | 11/11 (A1-A11). Graded by grade.zsh: A1-A9, A11 verified over HTTP/static checks; A10 confirmed by reading the tests. |
| Acceptance Criteria Passed / Total | 12/12 (A-AC1-A-AC12). A-AC1-A-AC10 probed independently over HTTP (12 courses; defaults, filters, paging, asc createdAt/updatedAt sort, 9 invalid queries -> 400 with one INVALID_QUERY_PARAMETER shape, empty result -> totalPages 0); A-AC11 by reading tests; A-AC12 docs check. Note: this run returns 400 for unknown and repeated query parameters (settles the open question from the cycle 4 clean run). |
| Tests Passed / Failed | All pass. Unit 570/0 (application-services 30); arch 20/0; acceptance 13 scenarios/0. |
| Static Analysis / Security Findings | verify passed every step through test; failed at pnpm audit on 12 pre-existing findings (7 moderate, 3 high, plus 1 high ignored by the existing auditConfig). High findings itemized in the log, all in main's pnpm-lock.yaml: follow-redirects@1.16.0 (2 advisories), vite@8.3.0, launch-editor@2.14.1. Moderate findings not itemized in the log; count matches cycle 4 and the agent named uuid@8.3.2, smol-toml@1.8.0, hono@4.13.10, all pre-existing on main. Snyk (agent report, grader did not re-run): @vitest/mocker@4.1.11, fast-uri@3.1.8, follow-redirects@1.16.0, hono@4.13.10, launch-editor@2.14.1, picomatch@2.3.2, picomatch@4.0.7, qs@6.16.0, vite@8.3.0 - all pre-existing on main. Boundary diff vs ffe2d4c (grader): 22 paths, all inside the SRD write set; no cellix/service-mongoose files touched; lockfile changes are workspace:* links only; tsconfig edits in apps/api, application-services, persistence add only matching references. No new third-party deps, no secrets, no auth/env/deploy changes. |
| Input Tokens | 167,798 |
| Cached Tokens | 8,322,432 |
| Output Tokens | 80,514 |
| Total Tokens or Credits Used | 8,570,744 |
| Estimated Cost | Included in Cursor Teams Premium. Token total is +50% vs the ~5.7M plateau and +125% vs iter 1 (3.80M). |
| Elapsed Time | 1h 34m |
| Number of Human Interventions / Redirects | 0 |
| Reviewer Notes | (leave blank for now) |
| Final Rubric Score | 89/100. Functional 5, Tests 5, Architecture 5 (correct layering, arch 20/0, though via constructor injection rather than ApiContext), Security 5 (all findings pre-existing), Harness Eng 4 (prediction missed; change killed but produced a strong, logged finding), Cost 3 (8.57M, worst run), Workflow 3 (0 interventions but 1h34m, far longer than any prior run), Vendor 4. |
| Recommendation | Continue - kill cycle 5 change; KEEP the data-access prose (it saves ~2.9M tokens). Cycle 6 makes the prose fully prescriptive to cut arch-test iteration turns below the ~5.7M plateau. |

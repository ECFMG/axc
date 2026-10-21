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
| Run Type | Harness Engineering Iteration 4 |
| Harness Engineering Used | Iteration 3 harness with one change: cache-locality AGENTS.md. Stable rules condensed into a short cached prefix (50 -> 35 lines); the "Known verify failures" paragraph moved verbatim to a new AGENTS.verify.md read only when verify fails at pnpm audit or Snyk. Kept unchanged: ApiContext data access, the archunit rule (application-services may import only types from @axc/persistence), and the cycle 3 pre-existing-finding rule. |
| Config / Diff Notes | fy-cur-4 = 25bb749 on fy-cur-3 (e9eb45a); AGENTS.md -15 lines plus new AGENTS.verify.md. Hypothesis: cache reads are 95% of tokens, so the lever is cache locality (shorter stable prefix, volatile content read on demand). Prediction: ~4.5M total, cache reads <4.2M, Architecture 5. Stop condition: >5.5M tokens or Architecture <5. Result: clean rerun ~5.7M total -> stop condition hit, change KILLED. Two earlier runs were voided and not scored: the first (1b74a8e) hit a node_modules recreate plus human steering; a second was a verify-only pass where the agent checked the existing commit instead of rebuilding. Clean rerun is fy-cur-4-a-out @ 3bc7aaf, cut from 25bb749 with pnpm install pre-run. Finding: condensing AGENTS.md moved nothing; cost tracks agent turn count, not prefix size. Same prompt as baseline. |
| Branch / Commit | fy-cur-4-a-out @ 3bc7aaf |
| Requirements Completed / Attempted | 11/11 (A1-A11). Graded by grade.zsh: A1-A9, A11 verified over HTTP/static checks; A10 confirmed by reading the tests. |
| Acceptance Criteria Passed / Total | 12/12 (A-AC1-A-AC12). A-AC1-A-AC10 probed independently over HTTP (12 courses; defaults, case-insensitive q/tag, three filters, paging, asc createdAt and updatedAt sort, 9 invalid queries -> 400 with one INVALID_QUERY_PARAMETER shape, empty result -> totalItems 0); A-AC11 by reading tests; A-AC12 docs check. |
| Tests Passed / Failed | All pass. Unit 568/0 (application-services 28, incl. 12 catalog tests); arch 20/0; acceptance 9 scenarios/0 (8 course + 1 health). |
| Static Analysis / Security Findings | verify passed every step through test; failed at pnpm audit on 12 pre-existing findings (7 moderate, 3 high, plus 1 high ignored by the existing auditConfig; config unchanged vs main). Every package@version appears in main's pnpm-lock.yaml: uuid@8.3.2, smol-toml@1.8.0, hono@4.13.10, follow-redirects@1.16.0, vite@8.3.0, launch-editor@2.14.1. Snyk (agent report, grader did not re-run): hono@4.13.10, fast-uri@3.1.8, follow-redirects@1.16.0, picomatch@2.3.2, picomatch@4.0.7, qs@6.16.0, @vitest/mocker@4.1.11 - all pre-existing on main. Boundary diff vs 25bb749 (grader): 22 paths, all inside the SRD write set; no cellix/service-mongoose files touched; lockfile changes are workspace:* links only (api->persistence, application-services->domain, persistence->domain); tsconfig edits in apps/api, application-services, persistence add only matching references. No new third-party deps, no secrets, no auth/env/deploy changes. |
| Input Tokens | Not separately reported for the clean rerun (operator captured total only). |
| Cached Tokens | Not separately reported for the clean rerun. |
| Output Tokens | Not separately reported for the clean rerun. |
| Total Tokens or Credits Used | ~5,700,000 (operator-reported total; exact breakdown not captured). |
| Estimated Cost | Included in Cursor Teams Premium. Token total is flat against the iteration 2/3 plateau (~5.7M). |
| Elapsed Time | 17m 13s |
| Number of Human Interventions / Redirects | 0 |
| Reviewer Notes | (leave blank for now) |
| Final Rubric Score | 93/100. Functional 5, Tests 5, Architecture 5 (ApiContext pattern kept, arch 20/0), Security 5 (all findings pre-existing), Harness Eng 4 (prediction missed; change killed but measured and logged), Cost 4 (flat ~5.7M vs iter 2/3; +50% vs iter 1), Workflow 4 (0 interventions; 17m13s, faster than iter 3's 23m49s), Vendor 4. |
| Recommendation | Continue - kill cycle 4 change (cache locality moved nothing; cost tracks turn count). Cycle 5 isolates whether the data-access prose or the arch test drives the extra turns. |

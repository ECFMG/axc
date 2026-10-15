### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field | Value |
| --- | --- |
| Team |  Cursor |
| Developer / Operator | Frank Yang |
| Reviewer | (leave blank for now) |
| Harness | Cursor |
| Model |Grok 4.7(high)|
| License / Plan |Cursor Teams Premium |
| Codebase | ECFMG/axc |
| Task Set | A  |
| Run Type | Baseline / Harness Engineering Iteration 2 |
| Harness Engineering Used | AGENTS.md (50 lines) + Data access section; new archunit test: application-services may import only types from @axc/persistence|
| Config / Diff Notes |fy-cur-2 = fbe3f18 on fy-cur-1 (7c30f98). Prediction: no direct persistence calls in application-services, 12/12, total ≤ 4.37M. Result: architecture goal met; tokens 5.71M (+50% vs iter 1, −19% vs baseline) — kill switch breached. Confound: new pre-existing Snyk high (qs@6.16.0) appeared this run, not covered by AGENTS.md. Same prompt as baseline.  |
| Branch / Commit |fy-cur-2-a-out @ 659a787 |
| Requirements Completed / Attempted |11/11 (A1–A11) |
| Acceptance Criteria Passed / Total |12/12 (A-AC1–A-AC12) |
| Tests Passed / Failed | All pass. 12 course unit tests + 2 health; 17 course acceptance scenarios over HTTP + healthcheck; test:arch incl. new persistence-boundary rule passes.|
| Static Analysis / Security Findings verify passed every step through pnpm audit. Snyk: medium SNYK-JS-HONO-20883336 (hono@4.13.10) and high SNYK-JS-QS-20943482 (qs@6.16.0), both pre-existing on main (qs is in main's lockfile; advisory newly published). No new third-party deps, no secrets, no writes outside boundary. | |
| Input Tokens |374,591 |
| Cached Tokens | 5,257,856 |
| Output Tokens |77,119 |
| Total Tokens or Credits Used |5,709,566  |
| Estimated Cost |Included in Cursor Teams Premium. Retail-equivalent ≈ $3.84 at SRD grok-4.5 rates (stand-in); iter 1 ≈ $2.51, baseline ≈ $4.52.  |
| Elapsed Time |21m 43s |
| Number of Human Interventions / Redirects |0 |
| Reviewer Notes | (leave blank for now) |
| Final Rubric Score | 93/100. Functional 5, Tests 5, Architecture 5 (CourseCatalog contract in domain, implemented in persistence, injected via ApiContext from apps/api), Security 5, Harness Eng 4 (quality + cost up vs baseline; speed down), Cost 4 (−19% vs baseline, +50% vs iter 1), Workflow 4 (0 interventions; 21m vs 14m baseline), Vendor 4 |
| Recommendation | Continue |

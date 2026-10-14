### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field | Value |
| --- | --- |
| Team | Cursor |
| Developer / Operator |Frank Yang |
| Reviewer | (leave blank for now) |
| Harness |Cursor |
| Model | Grok 4.7(high) |
| License / Plan |	Cursor Teams Premium |
| Codebase | ECFMG/axc |
| Task Set | A |
| Run Type | Harness Engineering Iteration 1 |
| Harness Engineering Used | Added AGENTs.md file |
| Config / Diff Notes |fy-cur-1 = 9858579 + 7c30f98 on main 9c890d7. Prediction before run: cached tokens down ≥20% at 12/12. Result: cached −46%, total −46% vs baseline 7,071,610. Same prompt as baseline |
| Branch / Commit | fy-cur-1-a-out|
| Requirements Completed / Attempted |11/11 (A1–A11) |
| Acceptance Criteria Passed / Total |12/12 (A-AC1–A-AC12) |
| Tests Passed / Failed |All pass. New: 11 course unit tests (application-services), 7 course acceptance scenarios over HTTP; healthcheck unit + acceptance and architecture tests still pass.|
| Static Analysis / Security Findings | verify passed every step through pnpm audit. Snyk: 1 medium, SNYK-JS-HONO-20883336 in hono@4.13.10, pre-existing on main. No new third-party deps (workspace links only), no secrets, no writes outside boundary. |
| Input Tokens |191,091  |
| Cached Tokens |3,547,520 |
| Output Tokens | 58,200 |
| Total Tokens or Credits Used |3,796,811  |
| Estimated Cost | Included in Cursor Teams Premium (no per-run dollar shown). Retail-equivalent ≈ $2.51 at SRD grok-4.5 rates; baseline ≈ $4.52 on the same basis.|
| Elapsed Time |12m 57s |
| Number of Human Interventions / Redirects |0 |
| Reviewer Notes | (leave blank for now) |
| Final Rubric Score | 94/100. Functional(5/5): All requirements met; the debatable behaviors aren’t defined by the spec,  Tests(5/5):  Unit and HTTP acceptance tests; verify passed through to Snyk, Architecture(4/5): The repository isn’t passed in from apps/api,  Security(5/5): Nothing new; the hono finding is pre-existing, Harness Eng(4/5): Needs repeatability, but some gains in cost and a bit in time, Cost(5/5): Tokens down, Workflow(5/5): no interventions, Vendor(4/5)|
| Recommendation | Continue  |

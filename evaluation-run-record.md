### Evaluation Run Record

Each participant should complete one Evaluation Run Record per harness/model run.

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Duy Nguyen / Codex |
| Reviewer | |
| Harness | Codex |
| Model | GPT-5.6 Sol (High) |
| License / Plan | Business (self_serve_business_prolite) |
| Codebase | ECFMG/axc |
| Task Set | A — TS-A-CATALOG-SEARCH |
| Run Type | Baseline |
| Harness Engineering Used | None detected; baseline repository instructions and tooling only |
| Config / Diff Notes | Added a 12-course in-memory catalog, application-service search/filter/pagination/sort behavior, validated `GET /api/courses` Hono route and Azure Functions registration, unit and HTTP acceptance coverage, and Docusaurus API documentation. No dependency or production-configuration changes. |
| Branch / Commit | `dn-oai-0-a-out` / `6646fd68b289a42a1422d4b4ec0c24ea34a9f2f2` |
| Requirements Completed / Attempted | 11 / 11 functional requirements (A1–A11) |
| Acceptance Criteria Passed / Total | 12 / 12 (A-AC1–A-AC12) |
| Tests Passed / Failed | 559 unit tests and 15 acceptance scenarios passed / 0 failed (`pnpm test`) |
| Static Analysis / Security Findings | Biome lint: 199 files clean; TypeScript: 21/21 tasks passed; build: 18/18 tasks passed. pnpm audit: 1 high-severity production dependency vulnerability (GHSA-…, package …, dependency path …). Snyk open-source scan: 23 projects tested; 9 total issues, all ignored (0 critical, 7 high, 2 medium, 0 low); 0 open issues. |
| Input Tokens | 7690500 |
| Cached Tokens | 7544448 |
| Output Tokens | 35572 |
| Total Tokens or Credits Used | 7726072 |
| Estimated Cost | Not available |
| Elapsed Time | 31m 52s |
| Number of Human Interventions / Redirects | 0 |
| Reviewer Notes | |
| Final Rubric Score | 69/100 |
| Recommendation | Stop |

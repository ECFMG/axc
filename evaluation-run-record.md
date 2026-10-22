# Evaluation Run Record — Iteration 8, Task Set B

Evaluated 2026-10-22. Feature output: `8ca116b8a51f5350883ceb211c6c1f81449ab1b8` on `dn-oai-8-b-out`; starting commit: `8972088857fc29ce33f279b8708adf2064e8847c`. Session: `01a16083-b6e6-7bb3-b756-484abe3c8fb6`. See [scoring details](evaluation-run-record-scoring-details.md) for evidence and limits.

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Duy Nguyen |
| Reviewer | Duy Nguyen + Codex independent evaluation |
| Harness | Codex CLI with repository AGENTS.md, Cellix architecture skill, and verification gate |
| Model | `gpt-6-sol` |
| License / Plan | ChatGPT Business (`self_serve_business_prolite`) |
| Codebase | ECFMG/axc |
| Task Set | B, including Task Set A course search |
| Run Type | Harness Engineering Iteration 8 |
| Harness Engineering Used | Cellix architecture and run workflow instructions; rendered-document checker; architecture, acceptance, dependency, and security gates |
| Config / Diff Notes | The rendered-document checker is an engineered harness component that validates Markdown fences and required headings in generated HTML. The parent commit also includes dependency remediation; the feature commit changes 60 files under allowed feature paths plus the justified root lockfile. |
| Branch / Commit | `dn-oai-8-b-out` / `8ca116b8a51f5350883ceb211c6c1f81449ab1b8` |
| Requirements Completed / Attempted | 28 / 28 functional requirements across A and B, based on implementation and review |
| Acceptance Criteria Passed / Total | 27 / 27 supported by implementation, focused tests, host acceptance, and rendered docs review; evidence depth varies by criterion |
| Tests Passed / Failed | Independent `pnpm run verify`: 29/29 Turbo test tasks, 4/4 host scenarios, 38/38 architecture tests, 36/36 AXC domain, persistence, and application-service tests; 0 product-test failures. |
| Static Analysis / Security Findings | Biome, typecheck, build, rendered-doc check, Knip, and dependency analysis passed. `pnpm audit`: 1 high advisory, ignored by existing policy. Snyk: 0 open, 13 ignored (10 high, 3 medium) across 23 projects. No feature-attributable finding identified. |
| Input Tokens | 739,433 |
| Cached Tokens | 585,024 |
| Output Tokens | 37,408, including 5,570 reasoning tokens |
| Total Tokens or Credits Used | 776,841 tokens; credits unavailable |
| Estimated Cost | Unavailable in local session log; no dollar estimate made |
| Elapsed Time | 13m 43s active; 13m 44s wall |
| Number of Human Interventions / Redirects | 0 after the initial task prompt in the supplied session |
| Reviewer Notes | All four enrollment endpoints and course search are documented and implemented. Two distinct combined course-filter inputs satisfy A-AC11. Compared with the Task B baseline on `dn-oai-0-b-out`, total tokens decreased 52.2% while the rubric score increased from 67 to 96. For the closer quality comparison, active time decreased 42.7% from iteration 7 to iteration 8. Actual dollar cost is excluded from the efficiency score. Existing security-policy ignores remain and vendor approval evidence is unavailable. |
| Final Rubric Score | 96 / 100 |
| Recommendation | Candidate for cage match |

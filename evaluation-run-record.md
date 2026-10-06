### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Duy Nguyen |
| Reviewer | Duy Nguyen |
| Harness | Codex |
| Model | gpt-6-sol (medium) |
| License / Plan | Business (self_serve_business_prolite) |
| Codebase | ECFMG/axc |
| Task Set | A |
| Run Type | Harness Engineering Iteration 1 |
| Harness Engineering Used | `AGENTS.md`; `cellix-architecture` skill and references; architecture tests and completion-gate tests as guardrails |
| Config / Diff Notes | Harness baseline `93fcb62` added the repository instructions, Cellix architecture skill/references, and architecture tests. The run added the course catalog endpoint, fixture-backed read repository, application query, REST validation, unit/acceptance tests, and API docs. Post-run review found Cellix structural deviations and a `pnpm-lock.yaml` write-boundary exception; see `evaluation-run-record-scoring-details.md`. |
| Branch / Commit | `dn-oai-1-a-out` / `7e182271fc08ac74d05c8a790a74bf5bc5ed0929` |
| Requirements Completed / Attempted | 11 / 11 functional requirements implemented |
| Acceptance Criteria Passed / Total | 12 / 12 based on execution-session validation |
| Tests Passed / Failed | Focused: 10 / 0 tests; acceptance: 12 / 0 scenarios; full run: 27 / 0 Turbo tasks |
| Static Analysis / Security Findings | Lint, typecheck, build, and architecture checks passed. No secret-scan or authenticated static-security scan evidence was available. Post-run review found domain/persistence structure, application-service composition/naming, and architecture-test coverage gaps; the lockfile change was outside the stated write boundary. |
| Input Tokens | 2,832,337 total input tokens (86,481 uncached) |
| Cached Tokens | 2,745,856 (96.95% of input) |
| Output Tokens | 13,991 (including 2,671 reasoning tokens) |
| Total Tokens or Credits Used | 2,846,328 tokens; credits unavailable |
| Estimated Cost | Unavailable; no dollar estimate inferred from the Business plan |
| Elapsed Time | 7m 5s (2026-10-01 20:17:42.803Z–20:24:47.933Z) |
| Number of Human Interventions / Redirects | 0 redirects after the initial task message |
| Reviewer Notes | (leave blank for now) |
| Final Rubric Score | 71 / 100 |
| Recommendation | Remediate |

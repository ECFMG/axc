### Evaluation Run Record

Each participant should complete one Evaluation Run Record per harness/model run.

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Duy Nguyen |
| Reviewer | (leave blank for now) |
| Harness | Codex |
| Model | gpt-6-sol (medium) |
| License / Plan | Business (self_serve_business_prolite) |
| Codebase | ECFMG/axc |
| Task Set | A — TS-A-CATALOG-SEARCH |
| Run Type | Harness Engineering Iteration 2 |
| Harness Engineering Used | `AGENTS.md`; strengthened `cellix-architecture` skill, architecture map, and alignment review; architecture and completion-gate tests as guardrails |
| Config / Diff Notes | Harness commit `9711332` tightened factory injection, read-repository ownership, context naming, explicit service-interface, file-suffix, and review requirements. The output added a 12-course fixture-backed catalog, injected readonly data sources, a curried search service, validated Hono route, unit/acceptance coverage, and Docusaurus docs. The implementation is staged; a commit attempt was stopped by the repository audit hook. |
| Branch / Commit | `dn-oai-2-a-out` / staged output on harness base `971133256a802382f3aa25266250a36b143696c2` (no output commit) |
| Requirements Completed / Attempted | 11 / 11 functional requirements (A1–A11) |
| Acceptance Criteria Passed / Total | 12 / 12 (A-AC1–A-AC12) |
| Tests Passed / Failed | 554 unit tests, 31 architecture tests, and 12 acceptance scenarios passed / 0 failed; full run 27 / 27 Turbo tasks |
| Static Analysis / Security Findings | Lint, typecheck, build, architecture, unit, and acceptance checks passed. No secret-like values were found in the staged diff. `pnpm audit` reported 8 repository dependency findings (3 moderate, 3 high with 2 ignored, 2 critical), and prevented the commit; the diff adds only workspace dependencies and does not change third-party versions. `pnpm-lock.yaml` is outside the explicit Task Set A write boundary. Snyk did not run because the verify pipeline stopped at audit. |
| Input Tokens | 4,225,314 total input tokens (147,746 uncached), including the associated guardian run |
| Cached Tokens | 4,077,568 (96.50% of input) |
| Output Tokens | 19,882 (including 4,371 reasoning tokens) |
| Total Tokens or Credits Used | 4,245,196 tokens; credits unavailable |
| Estimated Cost | Unavailable; no dollar estimate inferred from the Business plan |
| Elapsed Time | 8m 32s (2026-10-06 17:07:26.448–17:15:58.058 EDT) |
| Number of Human Interventions / Redirects | 0 redirects after the initial task message |
| Reviewer Notes | Feature behavior, tests, and Cellix alignment are strong. Remediate the dependency-scan findings and document the lockfile boundary exception before pilot consideration. |
| Final Rubric Score | 83 / 100 |
| Recommendation | Remediate |

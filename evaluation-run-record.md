# Evaluation Run Record — Task Set B output

Evaluation date: 2026-10-08. Evidence is commit `f3df6bc688ae246dcb746c8ee4dd45e978c4bf9c`, source review, session log `01a11bfa-367d-7c73-a044-a71164269bfa`, and current verification results.

| Field | Value |
| --- | --- |
| Team | OpenAI (session log provider) |
| Developer / Operator | Duy Nguyen |
| Reviewer | Duy Nguyen |
| Harness | Codex in VS Code, CLI `0.162.0-alpha.2`, with repository `AGENTS.md`, `.agents/harness-run-workflow.md`, and Cellix architecture skill |
| Model | `gpt-6-sol` |
| License / Plan | Business (`self_serve_business_prolite`); vendor approval details unavailable |
| Codebase | ECFMG/axc |
| Task Set | B — TS-B-COURSE-ENROLLMENT-WORKFLOW |
| Run Type | Harness Engineering Iteration 4 |
| Harness Engineering Used | Repository workflow, architecture instructions and skill, boundary/lockfile discipline, focused tests, required lint/typecheck/build/test checks, and live API smoke test. |
| Config / Diff Notes | Feature changes are committed within `apps/api`, `apps/docs`, and existing `packages/axc` packages. The root lockfile records the declared workspace edges, Vitest, and the targeted `smol-toml` audit remediation. |
| Branch / Commit | `dn-oai-4-b-out` / `f3df6bc688ae246dcb746c8ee4dd45e978c4bf9c` |
| Requirements Completed / Attempted | 17/17 attempted. B1–B15 and B17 supported; B16 documentation partial. |
| Acceptance Criteria Passed / Total | 14/15 supported by source, focused HTTP tests, the full repository test run, and live API smoke testing. B-AC15 documentation is partial. |
| Tests Passed / Failed | 4/4 new REST tests and 21/21 axc architecture tests passed; full `pnpm run test` reported 28/28 successful Turbo tasks. Lint, typecheck, build, and the live API smoke test also passed. |
| Static Analysis / Security Findings | Current `pnpm audit` reports only two high advisories ignored by existing policy; the `smol-toml` advisory is remediated with a targeted override. Snyk tested 23 projects and reported 9 ignored issues and 0 open issues. Knip passes with 33 configuration hints; Biome reports 23 informational `useLiteralKeys` diagnostics. |
| Input Tokens | 6,907,833 (includes cached input) |
| Cached Tokens | 6,792,448 (subset of input) |
| Output Tokens | 25,739 (includes 3,412 reasoning tokens) |
| Total Tokens or Credits Used | 6,933,572 total tokens; credits unavailable |
| Estimated Cost | Unavailable in local session log |
| Elapsed Time | 14m 24s wall; 14m 23s active |
| Number of Human Interventions / Redirects | 0 after the task prompt in the supplied session log |
| Reviewer Notes | Core behavior works and the required checks and live HTTP smoke test passed. Cellix review found moderate structural work in persistence composition and production transport dependencies, plus missing focused tests for custom persistence semantics and incomplete API response documentation. |
| Final Rubric Score | **72/100** (see `evaluation-run-record-scoring-details.md`) |
| Recommendation | **Remediate** |

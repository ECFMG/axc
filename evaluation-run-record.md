### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Henry Casper |
| Reviewer |  |
| Harness | OpenAI Codex CLI v0.162.0 |
| Model | GPT-6.1-Sol (medium reasoning) |
| License / Plan | ChatGPT Business (Pro Lite seat) |
| Codebase | ECFMG/axc |
| Task Set | A |
| Run Type | Harness Engineering Iteration 2 |
| Harness Engineering Used | `AGENTS.md` v2 (builds on v1; still general, repository-wide, nothing task-specific). Added: **Scope** — change only what the task requires, do not modify/remove/reformat unrelated code, exports or configuration, no new config files unless required; **Dependencies** — use `pnpm install --offline` first for `workspace:*`/already-installed packages, lockfile diff limited to changed dependencies; **Sandbox and verification** — no network in sandbox so batch network commands, run network-free checks (lint, typecheck, build, test:arch, test) directly while iterating, run `pnpm run verify` once at the end, treat the known `main` `pnpm audit` advisories as pre-existing without re-auditing. Same model, effort, permissions (workspace-write, on-request approvals, no network) as baseline and iteration 1. |
| Config / Diff Notes | `hac-oai-2` = `hac-oai-1` + `AGENTS.md` v2 (`3936e87`). Contents of `task-set-a-prompt.md` pasted verbatim as a single prompt in a new Codex session; `/status` confirmed settings and `AGENTS.md` loaded. Agent output: 26 files changed (+578/−9). All source changes within the allowed write boundary; agent asked (via Codex question prompt) whether it could update `pnpm-lock.yaml`, which the prompt's write boundary does not list — operator selected the preset option "Allow the matching lockfile entries". Lockfile diff contains only new entries for the added workspace dependencies/Vitest config (minor: `@axc/rest` Vitest entry resolves `@types/node@26.6.2` while other packages use 24.10.1). No unrelated changes: `UnitOfWork` export preserved, no extra `turbo.json`. Leftover build artifacts deleted before the run. Committed with `--no-verify` because the pre-commit `pnpm run verify` fails on `pnpm audit` advisories that already exist on `main`. |
| Branch / Commit | `hac-oai-2-a-out` @ `afd40d3` |
| Requirements Completed / Attempted | 12 / 12 |
| Acceptance Criteria Passed / Total | 12 / 12 (A-AC1–A-AC12) |
| Tests Passed / Failed | All suites pass / 0 failed (independently re-run by operator). `@axc/rest` 51 tests (new colocated `courses.test.ts`: search, filters, combined filters, pagination, sorts, table-driven validation cases, no-match), `@axc/application-services` 8 (new `courses.test.ts` + updated `health.test.ts`). Acceptance: 7 scenarios pass (Scenario Outline ×5 + invalid pagination + existing health). Biome, typecheck, build, knip, e18e, docs build, architecture tests (9 rules) pass. `pnpm install --frozen-lockfile` passes. |
| Static Analysis / Security Findings | No new findings introduced. `pnpm audit`: 8 advisories (2 critical, 3 high, 3 moderate), identical to `main`. Snyk (personal org; repo-configured `agentcourses` org not accessible): 2 open (1 high postcss-selector-parser, 1 medium uri-js), identical to `main`. |
| Input Tokens | 1,967,117 (95,997 uncached) |
| Cached Tokens | 1,861,120 |
| Output Tokens | 16,742 (incl. 2,900 reasoning) |
| Total Tokens or Credits Used | 1,983,859 tokens |
| Estimated Cost | ~$0.55 at GPT-6.1-Sol API list prices ($2.00 input / $0.10 cached / $10.00 output per 1M tokens) |
| Elapsed Time | 12m 18s (2026-10-09 10:45:53–10:58:11 EDT) |
| Number of Human Interventions / Redirects | 1 intervention: answered one agent question (permission to update `pnpm-lock.yaml`, outside the prompt's write boundary) by selecting a preset option; no guidance typed, 0 redirects. 6 sandbox-escalation approvals (down from 9): `pnpm run build` (pnpm stalled in sandbox), batched lint/typecheck/test:arch/test/docs build/frozen install, `test:arch`, frozen offline install, frozen install + `verify`, Snyk. Initial `pnpm install --offline` ran in-sandbox with no approval. |
| Reviewer Notes | (leave blank for now) |
| Final Rubric Score | 95 / 100 (self-scored per SRD Appendix 1). Functional Correctness 5/5 (20): all requirements and acceptance criteria met; error body matches spec. Test and Validation 5/5 (15): colocated unit/HTTP tests with table-driven validation, 6 new acceptance scenarios, frozen-lockfile install passes. Architecture 5/5 (15): domain owns `Course`, constants and a read-only `CourseCatalogRepository` (documented reason for not extending the writable `DomainRepository` get/save contract); service injected via `ApiContext` with no hidden defaults; single source of truth for constants; no unrelated edits or test-config narrowing. Security and Guardrails 5/5 (15): no new findings or third-party dependencies, strict input validation, vendored code untouched. Harness Engineering 4/5 (8): v2 eliminated iteration 1's unrelated edits and lockfile churn and cut approvals 9→6, but the lockfile rule conflicted with the prompt's write boundary and caused one agent question. Context/Token/Cost 5/5 (10): ~$0.55 (up from ~$0.40) but still well under $1. Developer Workflow Fit 4/5 (8): 12m 18s, 1 intervention and 6 approvals. Operational/Vendor Readiness 4/5 (4): ChatGPT Business with admin/SSO path, not production-approved. |
| Recommendation | Continue |

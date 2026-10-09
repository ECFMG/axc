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
| Run Type | Harness Engineering Iteration 1 |
| Harness Engineering Used | Added a root `AGENTS.md` (21 lines) with general, repository-wide conventions: CellixJS layering and dependency direction, never modify vendored `packages/cellix/**`, reuse existing abstractions (repository contracts, seedwork), one source of truth for shared types/constants, colocated unit tests (`src/*.test.ts`), `archunit-tests` for architecture rules only, do not narrow existing test configs, keep `pnpm-lock.yaml` in sync (`pnpm install --frozen-lockfile` must pass), and run `pnpm run verify` before finishing. Nothing task-specific. Same model, effort, permissions (workspace-write, on-request approvals, no network) as baseline. |
| Config / Diff Notes | `hac-oai-1` = `main` @ `238fd21` + `AGENTS.md` (`003c24e`). Contents of `task-set-a-prompt.md` pasted verbatim as a single prompt in a new Codex session; `/status` confirmed `AGENTS.md` loaded. Agent output: 25 files changed (+656/−30). All source changes within the allowed write boundary; `pnpm-lock.yaml` also updated as `AGENTS.md` directs (outside the prompt's listed boundary, intentional harness rule), including incidental `supports-color` peer-resolution churn. Unrelated changes: removed the `UnitOfWork` type re-export from `packages/axc/persistence/src/index.ts`; added `apps/docs/turbo.json` (build cache inputs). Baseline build artifacts were deleted before the run to avoid contamination. Committed with `--no-verify` because the pre-commit `pnpm run verify` fails on `pnpm audit` advisories that already exist on `main`. |
| Branch / Commit | `hac-oai-1-a-out` @ `b2f7e10` |
| Requirements Completed / Attempted | 12 / 12 |
| Acceptance Criteria Passed / Total | 12 / 12 (A-AC1–A-AC12) |
| Tests Passed / Failed | All suites pass / 0 failed. New colocated tests: `@axc/rest` 55 (HTTP contract: search, every filter, combined filters, pagination, all sorts, 20 validation cases, no-match), `@axc/application-services` 8. Acceptance: 6 scenarios pass (5 new course scenarios). Biome, typecheck, build, knip, e18e, architecture tests pass. `pnpm install --frozen-lockfile` passes. |
| Static Analysis / Security Findings | No new findings introduced. `pnpm audit`: 8 advisories (2 critical, 3 high, 3 moderate), identical to `main`. Snyk (personal org; repo-configured `agentcourses` org not accessible): 2 open (1 high, 1 medium), identical to `main`. |
| Input Tokens | 1,404,189 (71,965 uncached) |
| Cached Tokens | 1,332,224 |
| Output Tokens | 12,137 (incl. 1,651 reasoning) |
| Total Tokens or Credits Used | 1,416,326 tokens |
| Estimated Cost | ~$0.40 at GPT-6.1-Sol API list prices ($2.00 input / $0.10 cached / $10.00 output per 1M tokens) |
| Elapsed Time | 8m 45s (2026-10-09 10:17:00–10:25:46 EDT) |
| Number of Human Interventions / Redirects | 0 redirects. 9 sandbox-escalation approvals clicked (network access for `pnpm install` ×2, `pnpm run verify` ×2, lint, docs build, `pnpm audit` ×2, Snyk); no guidance typed. |
| Reviewer Notes | (leave blank for now) |
| Final Rubric Score | 92 / 100 (self-scored per SRD Appendix 1). Functional Correctness 5/5 (20): all requirements and acceptance criteria met; error body matches spec exactly. Test and Validation 5/5 (15): tests colocated in owning packages, broad validation coverage, 5 acceptance scenarios, frozen-lockfile install passes. Architecture 4/5 (12): domain owns `Course`, constants and `CourseRepository extends DomainRepository<Course>`; REST imports domain constants; fixture repository implements full `get`/`save`/`list` contract with `NotFoundError`; no test-config narrowing. Deductions: unrelated removal of `UnitOfWork` re-export from persistence, extra `apps/docs/turbo.json`, lockfile peer-resolution churn. Security and Guardrails 5/5 (15): no new findings or third-party dependencies, strict input validation, vendored code untouched. Harness Engineering 4/5 (8): a small, general `AGENTS.md` fixed every baseline defect (lockfile, test placement, duplicated constants, unused seedwork) at no extra cost. Context/Token/Cost 5/5 (10): ~$0.40 vs ~$0.44 baseline. Developer Workflow Fit 4/5 (8): 0 redirects, 8m 45s, but 9 approval prompts because the harness requires verify/install under a no-network sandbox. Operational/Vendor Readiness 4/5 (4): ChatGPT Business with admin/SSO path, not production-approved. |
| Recommendation | Continue |

### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field | Value |
| --- | --- |
| Team | OpenAI / Anthropic / Cursor / xAI / Antigravity |
| Developer / Operator | |
| Reviewer | (leave blank for now) |
| Harness | |
| Model | |
| License / Plan | |
| Codebase | ECFMG/axc |
| Task Set | A / B |
| Run Type | Baseline / Harness Engineering Iteration N / Final |
| Harness Engineering Used | |
| Config / Diff Notes | |
| Branch / Commit | |
| Requirements Completed / Attempted | |
| Acceptance Criteria Passed / Total | |
| Tests Passed / Failed | |
| Static Analysis / Security Findings | |
| Input Tokens | |
| Cached Tokens | |
| Output Tokens | |
| Total Tokens or Credits Used | |
| Estimated Cost | |
| Elapsed Time | |
| Number of Human Interventions / Redirects | |
| Reviewer Notes | (leave blank for now) |
| Final Rubric Score | (leave blank for now) |
| Recommendation | Continue / Remediate / Stop / Candidate for Pilot |

---

## Completed Record — TS-A-CATALOG-SEARCH

| Field | Value |
| --- | --- |
| Team | Anthropic |
| Developer / Operator | Seven Thomas |
| Reviewer | (leave blank for now) |
| Harness | Claude Code (VS Code extension) |
| Model | Opus 5 (`claude-opus-5`) |
| License / Plan | Not captured — operator to fill |
| Codebase | ECFMG/axc |
| Task Set | A — Course Catalog Search Endpoint |
| Run Type | Baseline |
| Harness Engineering Used | None. No `CLAUDE.md`, no custom skills, subagents, or workflows invoked (the session transcript records 0 sidechain/subagent messages). Default tool permissions with auto mode (Bash-first file reads/edits). The repo's `.agents/skills/` (turborepo, portless) was not loaded by this harness. |
| Config / Diff Notes | Implemented against `fe47c38` on `main`; the branch later moved to `st-ant-0-a-out` on top of `238fd21` (`update pnpm version`), which also reverted the lockfile and required regenerating it. Followed the write boundary in `task-set-a-requirements.md`, which permits `packages/axc/domain/**`; the prompt's shorter boundary list omits it. Added workspace-internal devDependencies (`vitest`, `@cellix/config-vitest`, `@vitest/coverage-istanbul`) to `@axc/persistence` — all already in the catalog, no new external packages. `pnpm-workspace.yaml` was also changed (outside the Task Set A boundary, on operator instruction) to clear pre-existing audit/Snyk advisories that were blocking the pre-commit gate. |
| Branch / Commit | `st-ant-0-a-out` @ `20fac44` (pushed; working tree clean). 33 files, +1324 / −98. |
| Requirements Completed / Attempted | 12 / 12 prompt requirements (= 11 / 11 spec requirements A1–A11) |
| Acceptance Criteria Passed / Total | 12 / 12 (A-AC1 – A-AC12) |
| Tests Passed / Failed | 597 / 0 unit + integration (`turbo run test`, 11 packages; count includes vitest typecheck-mode assertions) · 19 / 0 architecture (`turbo run test:arch`; 9 in `@axc-verification/archunit-tests`) · 20 / 0 Serenity/Cucumber acceptance scenarios. Added by this run: 31 unit tests (17 application-services, 14 persistence) and 19 acceptance scenarios; 1 existing test file updated for the new `ApiContext`. |
| Static Analysis / Security Findings | No findings attributable to this run. Biome 0 (307 files) · tsgo 0 errors (23/23 typecheck tasks) · Knip 0 unused files/exports/dependencies (33 pre-existing config hints) · `@e18e/cli` 0 errors · ArchUnit 19/19. Pre-existing dependency advisories found and remediated on operator instruction: 2 critical + 2 high + 1 moderate fixed by `pnpm` overrides (`tinypool` 1.1.1→2.2.0, `http-cache-semantics` 4.2.0→4.3.0, `source-map-js` 1.2.1→1.2.2, `postcss-selector-parser` 6.1.4→7.1.6, `ajv` 6.15.0→8.20.0, `smol-toml` 1.8.0→1.9.0). Residual: 1 high ignored with documented reason (`braces` GHSA-vfj7-8cjw-p6xm — no upstream fix exists; 3.0.3 is the newest version ever published) and 1 moderate below the `--audit-level=high` gate (`uuid` GHSA-w5hq-g745-h8pq — `.snyk` records that uuid 11+ is ESM-only and breaks the Azure Functions bundle). Final state: `pnpm run verify` exits 0, Snyk reports 0 issues across all 22 projects. |
| Input Tokens | 250 uncached. 125 API requests across the session; 96.1% of all input tokens were served from cache. |
| Cached Tokens | 23,638,150 cache reads + 957,138 cache writes (all 1-hour TTL; no 5-minute writes). |
| Output Tokens | 139,833 (66,238 of them thinking tokens) |
| Total Tokens or Credits Used | 24,735,371 billable tokens (250 uncached input + 957,138 cache write + 23,638,150 cache read + 139,833 output) |
| Estimated Cost | **$24.89** at `claude-opus-5` first-party API list rates — $0.00 uncached input + $9.57 cache writes + $11.82 cache reads + $3.50 output. By day: 2026-09-29 (Task Set A run) **$7.51**, 2026-10-07 (gate diagnosis + security remediation) **$11.34**, 2026-10-08 (this record) **$6.03**. All requests ran at standard speed and standard service tier — no fast-mode premium. If the account bills against a subscription plan rather than API list rates, actual cost will differ. |
| Elapsed Time | Task Set A run: 2026-09-29, first request 15:53 EDT, ~35–40 min wall clock (turbo cache and source timestamps run 15:55–16:08; verification continued past that). Follow-up operator turns: 2026-10-07 (~2 h 15 min, gate diagnosis and security remediation) and 2026-10-08 (this record). |
| Number of Human Interventions / Redirects | 0 during the Task Set A run — a single prompt, no redirects or corrections. 4 operator turns afterwards in the same session: (1) diagnose why the commit was blocked, (2) remediate the audit advisories, (3) install Node v24.18.0, (4) complete this record. |
| Reviewer Notes | (leave blank for now) |
| Final Rubric Score | (leave blank for now) |
| Recommendation | Continue |

### Evidence

| Claim | How it was verified |
| --- | --- |
| Endpoint contract | `GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title` against the running Azure Functions host returns the exact response in `task-set-a-requirements.md`. |
| Error contract | `GET /api/courses?pageSize=99&modality=remote` returns HTTP 400 with `INVALID_QUERY_PARAMETER` and both fields in `details`. |
| Acceptance path | 19 Gherkin scenarios drive real HTTP through the `@apps/api` composition root, not an in-process Hono instance. |
| Full gate | `pnpm run verify` exits 0: script policy, Biome, typecheck, build, Knip, e18e, arch tests, unit + acceptance tests, `pnpm audit`, Snyk. |
| Docs | Docusaurus build succeeds; `/courses` and `/decisions/fixture-backed-course-catalog-read-model` render in both the production build and the dev server. |

### Known limitations recorded by the run

- The catalog is a read-only 14-course fixture in `@axc/persistence`, filtered in process. No write path and no Mongoose implementation; the MADR at `apps/docs/docs/decisions/0001-fixture-backed-course-catalog-read-model.md` records why and what a real store would cost.
- Sorting is ascending only — the specification defines no direction parameter.
- Unrecognized query parameters are ignored rather than rejected; repeated parameters use the first value (Hono behavior). Both are documented.
- The `.snyk` ignores all expire 2026-10-28. `SNYK-JS-BRACES-19963945` still has no upstream fix, so the Snyk gate will begin failing after that date unless the ignore is renewed.

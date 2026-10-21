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

## Completed Record — TS-A-CATALOG-SEARCH (Harness Engineering Iteration 1)

| Field | Value |
| --- | --- |
| Team | Anthropic |
| Developer / Operator | Seven Thomas |
| Reviewer | (leave blank for now) |
| Harness | Claude Code (VS Code extension, v2.1.301) |
| Model | Opus 5.5 (`claude-opus-5-5`) |
| License / Plan | Claude Enterprise (Intealth organization, contracted subscription, managed seat) |
| Codebase | ECFMG/axc |
| Task Set | A — Course Catalog Search Endpoint |
| Run Type | Harness Engineering Iteration 1 |
| Harness Engineering Used | `CLAUDE.md`; hooks (session-start cleanup, write-boundary and suppression guards, Biome format on edit, Stop gate requiring a passing `verify`); permissions allowlist; turborepo and portless skills; `.mcp.json` (e18e, bothy-board); `verify:fast` and compact `verify` output. Auto mode. |
| Config / Diff Notes | Harness commit `acaa17b` on `st-ant-1`, which includes `main`'s audit/Snyk fixes (`9c890d7`). Model (Opus 5.5) and prompt (not verbatim `task-set-a-prompt.md`) differ from the baseline. Known harness issues deferred to Iteration 2: Bash guard misreads `>` in inline scripts; edit guard blocks `tsconfig.json` `references`; Stop hook flags files merged from `main`. |
| Branch / Commit | `st-ant-1-a-out` on `acaa17b` (uncommitted at time of record) |
| Requirements Completed / Attempted | 12 / 12 |
| Acceptance Criteria Passed / Total | 12 / 12 |
| Tests Passed / Failed | 63 / 0 unit · 19 / 0 architecture · 16 / 0 acceptance scenarios |
| Static Analysis / Security Findings | None introduced by the run. Biome, typecheck, build, Knip, e18e, and `pnpm audit` pass. Snyk was skipped during the run (CLI not on PATH); rescanned 2026-10-20: 8 of 23 projects have pre-existing transitive vulnerable paths (9 unique issues in follow-redirects, qs, picomatch, fast-uri, hono), identical on the pre-run commit `acaa17b` and the baseline `20fac44`. |
| Input Tokens | 74 |
| Cached Tokens | 2,914,882 cache reads + 80,363 cache writes |
| Output Tokens | 33,214 |
| Total Tokens or Credits Used | 3,028,533 |
| Estimated Cost | ~$1.89 (Opus 5.5 API list rates) |
| Elapsed Time | 7.6 min |
| Number of Human Interventions / Redirects | 0 during the task run. |
| Reviewer Notes | (leave blank for now) |
| Final Rubric Score | **3.7 / 5** (weighted; Operational and Vendor Readiness not scored, so normalized over the remaining 95%). Functional Correctness 4 · Test and Validation Performance 4 · Architecture and Codebase Alignment 3 · Security and Guardrail Compliance 4 · Harness Engineering Effectiveness 3 · Context, Token, and Cost Efficiency 5 · Developer Workflow Fit 3 · Operational and Vendor Readiness — (pending plan/vendor review) |
| Recommendation | Continue |
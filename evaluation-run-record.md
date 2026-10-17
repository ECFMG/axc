### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field | Value |
| --- | --- |
| Team | OpenAI (Modern Apps) |
| Developer / Operator | Dhaval Heruwala |
| Reviewer | Dhaval Heruwala (self-review) |
| Harness | OpenAI Codex CLI 0.162.1 (interactive) |
| Model | GPT-6.1-Sol, medium reasoning |
| License / Plan | ChatGPT Business (Business Premium seat) |
| Codebase | ECFMG/axc (agentCourses) |
| Task Set | Task Set A: Course Catalog Search Endpoint (TS-A-CATALOG-SEARCH) |
| Run Type | Harness Engineering Iteration 2 |
| Harness Engineering Used | Everything from iteration 1, plus: a cellix-slice skill (Cellix folder layout per layer, injection from apps/api, read and write patterns, input validation rules, where each test goes; loaded only for feature work); a second hook that runs pnpm install outside the sandbox whenever a package.json changes, so the agent never installs or touches the lockfile; the Stop hook now runs exactly what CI runs (frozen install, then verify); model and reasoning effort moved into the repo's .codex/config.toml, plus a README for rerunning the harness on another machine. |
| Config / Diff Notes | djh-oai-2 is djh-oai-1 plus one harness commit (cfc9cca). Same setup as before: fresh clone, hooks approved before the prompt, task-set-a-prompt.md pasted as is. The agent changed 38 files (+662/-9), all inside the write boundary, using Cellix's contexts/catalog/course layout in domain, application-services and persistence. The dependency hook ran pnpm install once, and the lockfile only gained the new workspace links. The CI gate failed once (a docs sidebar id that didn't exist), the agent fixed it, and the second attempt passed. |
| Branch / Commit | djh-oai-2-a-out @ `0cb82ce` |
| Requirements Completed / Attempted | 11 / 11 |
| Acceptance Criteria Passed / Total | 12 / 12 |
| Tests Passed / Failed | 595 passed / 0 failed in the unit suites (47 new in rest, 4 in application-services, 2 in persistence). 17/17 Serenity scenarios (16 new), 20/20 architecture tests. pnpm install --frozen-lockfile passes. GitHub Actions on PR #21: verify passed on both the push and pull request runs. Sourcery review: no issues found. |
| Static Analysis / Security Findings | 0 critical, 0 high, 0 medium new findings. pnpm run verify passes: Biome (318 files), typecheck, build, Knip, e18e, arch tests, all tests, pnpm audit (same as the start commit), Snyk (23 projects, clean). No secrets, no boundary violations, no tooling config changes. |
| Input Tokens | 1,225,818 |
| Cached Tokens | 1,179,264 |
| Output Tokens | 14,262 |
| Total Tokens or Credits Used | 1,240,080 tokens; 0 of 1,875 monthly credits (covered by the seat) |
| Estimated Cost | $0.35 at API list price ($2 input / $0.10 cached / $10 output per 1M) |
| Elapsed Time | 6 min 49 sec (including one failed and one passing run of the CI gate) |
| Number of Human Interventions / Redirects | 1 (approved one command, a Vitest run in archunit-tests that failed inside the sandbox; no steering or corrections) |
| Reviewer Notes | This is the first run that looks like it belongs in the repo. The code follows the Cellix layout: domain owns the course type and constants, persistence has a read repository with its data behind a DataSources factory, apps/api builds that factory and passes it in, application-services only imports persistence types, and REST has its own feature module. Every layer has its own tests, the 16 acceptance scenarios go through the real host, and there's a decision record explaining the in-memory fixtures. The empty `tag=` case is now a 400. The lockfile is in sync, so a clean CI install works. The gate caught a broken sidebar id before the agent finished, which is exactly what it's for. Concerns: the agent put a documentation test in archunit-tests, which is meant for architecture rules (that test is also what needed the one approval), and tokens went up 26% over iteration 1 for the extra layers. |
| Final Rubric Score | 91 / 100 |
| Recommendation | Continue. One more Task A iteration to remove the approval and trim tokens, then freeze for Task B. |

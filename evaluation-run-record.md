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
| Run Type | Harness Engineering Iteration 3 |
| Harness Engineering Used | Everything from iteration 2, plus three small changes aimed at tokens and the remaining approval: fast checks use Turbo's errors-only output, architecture and acceptance tests are left to the Stop hook, nothing goes into archunit-tests, and the gate's failure excerpt shows two lines of context after each error. |
| Config / Diff Notes | djh-oai-3 is djh-oai-2 plus one harness commit (f4d33ac, 2 files). Same setup as before: fresh clone, hooks approved before the prompt, task-set-a-prompt.md pasted as is. The agent changed 37 files (+623/-9), all inside the write boundary, with the same Cellix layout as iteration 2 and persistence injected from apps/api. The lockfile only gained the new workspace links. The CI gate failed once because the decision record's sidebar id didn't match (Docusaurus drops the 0001- prefix unless the page sets an id), the excerpt named the id, and the agent fixed it in one turn. |
| Branch / Commit | djh-oai-3-a-out @ `e159387` |
| Requirements Completed / Attempted | 11 / 11 |
| Acceptance Criteria Passed / Total | 12 / 12 |
| Tests Passed / Failed | 594 passed / 0 failed in the unit suites (44 new in rest, 6 in application-services, 2 in persistence). 16/16 Serenity scenarios (15 new, each tied to a criterion id and checking the exact course ids), 19/19 architecture tests. pnpm install --frozen-lockfile passes. GitHub Actions on PR #22: verify passed on both the push and pull request runs. Sourcery review: no issues found. |
| Static Analysis / Security Findings | 0 critical, 0 high, 0 medium new findings. pnpm run verify passes: Biome (317 files), typecheck, build, Knip, e18e, arch tests, all tests, pnpm audit (same as the start commit), Snyk (23 projects, clean). No secrets, no boundary violations, no tooling config changes. |
| Input Tokens | 593,587 |
| Cached Tokens | 569,728 |
| Output Tokens | 11,223 |
| Total Tokens or Credits Used | 604,810 tokens; 0 of 1,875 monthly credits (covered by the seat) |
| Estimated Cost | $0.22 at API list price ($2 input / $0.10 cached / $10 output per 1M) |
| Elapsed Time | 5 min 07 sec (including one failed and one passing run of the CI gate) |
| Number of Human Interventions / Redirects | 0 |
| Reviewer Notes | Best run so far on every measure. Same quality as iteration 2: Cellix context and entity folders, a read repository behind a DataSources factory that apps/api builds and injects, tests in each layer, acceptance scenarios for every criterion that check exact results, a decision record, and the empty `tag=` case handled as a 400. On top of that it took half the tokens of iteration 2 (and a third fewer than the baseline), 17 model requests instead of 29, no approvals, and about 5 minutes. The only hiccup was the decision record's sidebar id, which the gate caught and the agent fixed straight away. For a read-only feature the domain side uses the lightest Cellix pattern (a type plus constants), which a strict reviewer might want to see as a fuller entity. |
| Final Rubric Score | 95 / 100 |
| Recommendation | Candidate for Pilot. Freeze this configuration, run it once more on Task A to show it repeats, then run Task B. |

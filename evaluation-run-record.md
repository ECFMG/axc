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
| Run Type | Harness Engineering Iteration 4 (final configuration) |
| Harness Engineering Used | Everything from iteration 3, plus: decision records in the CellixJS MADR short format with an explicit id (which also fixes the sidebar id problem from iterations 2 and 3), one requirements traceability page in the docs, and the turborepo and portless skills from main switched off in .codex/config.toml so their descriptions don't load on every request. |
| Config / Diff Notes | djh-oai-4 is djh-oai-3 plus one harness commit (80081e1, 3 files). Same setup as every run: fresh clone, hooks approved before the prompt, task-set-a-prompt.md pasted as is. The agent changed 38 files (+739/-10), all inside the write boundary, with the same Cellix layout as iterations 2 and 3 and persistence injected from apps/api. The lockfile only gained the new workspace links. The CI gate passed on the first attempt. I'm freezing this configuration for Task B. |
| Branch / Commit | djh-oai-4-a-out @ `e45e3a9` |
| Requirements Completed / Attempted | 11 / 11 |
| Acceptance Criteria Passed / Total | 12 / 12 |
| Tests Passed / Failed | 608 passed / 0 failed in the unit suites (47 new in rest, 15 in application-services, 6 in persistence). 19/19 Serenity scenarios (18 new, each tied to a criterion id and checking the exact course ids), 19/19 architecture tests. pnpm install --frozen-lockfile passes. GitHub Actions on PR #23: verify passed on both the push and pull request runs. Sourcery review: 1 minor finding (see notes). |
| Static Analysis / Security Findings | 0 critical, 0 high, 0 medium new findings. pnpm run verify passes: Biome (317 files), typecheck, build, Knip, e18e, arch tests, all tests, pnpm audit (same as the start commit), Snyk (23 projects, clean). No secrets, no boundary violations, no tooling config changes. |
| Input Tokens | 687,498 |
| Cached Tokens | 646,784 |
| Output Tokens | 14,443 |
| Total Tokens or Credits Used | 701,941 tokens; 0 of 1,875 monthly credits (covered by the seat) |
| Estimated Cost | $0.29 at API list price ($2 input / $0.10 cached / $10 output per 1M) |
| Elapsed Time | 6 min 00 sec (including one passing run of the CI gate) |
| Number of Human Interventions / Redirects | 0 |
| Reviewer Notes | This run repeats what iteration 3 did and closes its gaps. Same Cellix layout and injection, no approvals, and this time the CI gate passed on the first try because the decision record had the right id. The docs now have an API page, a decision record in the team's MADR format, and a traceability page that maps every requirement and acceptance criterion to the test that proves it. Test coverage went up in every layer (18 acceptance scenarios checking exact results, 68 new unit tests). Tokens rose 16% over iteration 3, mostly because of the extra tests and docs; the agent also read the first part of the turborepo skill file directly, even though it's switched off, which is a small waste I'm leaving as a known limitation. Still 22% fewer tokens than the baseline with a much better result. As before, the read-only domain model uses the lightest Cellix pattern. Sourcery pointed out that the application service throws a plain RangeError with the messages joined together when a search is invalid; REST callers still get the structured 400, but other callers would lose the field details, so a typed error would be better. |
| Final Rubric Score | 98 / 100 |
| Recommendation | Candidate for Pilot. Freeze djh-oai-4 and run Task B on it once. |

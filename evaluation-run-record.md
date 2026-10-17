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
| Run Type | Harness Engineering Iteration 1 |
| Harness Engineering Used | AGENTS.md v1 (52 lines: definition of done, scope rules, a repo map so the agent doesn't have to explore, fast checks, token rules, final message format). A Codex Stop hook (.codex/hooks.json + verify-gate.mjs) that runs when the agent tries to finish: it checks the write boundary, runs pnpm run verify outside the sandbox, and hands back only the failing lines, at most 3 times. Same model, reasoning and permissions as the baseline. |
| Config / Diff Notes | djh-oai-1 is djh-oai-0 plus two commits. cd36410 is a security fix from me (qs 6.16.1 for SNYK-JS-QS-20943482, which was published after the baseline run). eb12bcb is the harness itself. I ran the task in a fresh clone (Codex doesn't load .codex/ from git worktrees), trusted the hook before pasting the prompt, and pasted task-set-a-prompt.md as is. The agent changed 18 files (+512/-4), all inside the write boundary. The hook's verify passed on the first try. One problem: the agent ran an approved pnpm install, then put pnpm-lock.yaml back to the committed version, so the three new workspace dependencies aren't in the lockfile and pnpm install --frozen-lockfile fails. I committed its output as produced. |
| Branch / Commit | djh-oai-1-a-out @ `ba59f8c` |
| Requirements Completed / Attempted | 11 / 11 |
| Acceptance Criteria Passed / Total | 12 / 12 |
| Tests Passed / Failed | 593 passed / 0 failed in the unit suites (49 new in @axc/rest). 17/17 Serenity scenarios (16 new for courses), 19/19 architecture tests. |
| Static Analysis / Security Findings | 0 critical, 0 high, 0 medium new findings. pnpm run verify passes: Biome (302 files), typecheck, build, Knip, e18e, arch tests, all tests, pnpm audit (same as the start commit), Snyk (23 projects, clean). No secrets, no boundary violations, no tooling config changes. Lockfile out of sync with package.json (see notes), so a CI-style frozen install fails. |
| Input Tokens | 973,795 |
| Cached Tokens | 933,376 |
| Output Tokens | 9,821 |
| Total Tokens or Credits Used | 983,616 tokens; 0 of 1,875 monthly credits (covered by the seat) |
| Estimated Cost | $0.27 at API list price ($2 input / $0.10 cached / $10 output per 1M) |
| Elapsed Time | 5 min 38 sec (about 4 min of agent work plus 1.5 min for the hook's full verify) |
| Number of Human Interventions / Redirects | 1 (approved one command, pnpm install, after the offline install stopped in the sandbox; no steering or corrections) |
| Reviewer Notes | Big step up from the baseline. Verify is green, the agent wrote 16 real Serenity scenarios that go through the Functions host plus 49 unit tests next to the REST code, and it didn't touch any tooling config. Everything I tried behaves as the spec says. The run was also 36% faster than the baseline. Tokens went up 9% because the agent did a lot more real work, but most of it was cached, so cost went down slightly. What still needs work: the lockfile revert described above breaks a clean install; application-services imports the course list straight from persistence instead of getting it injected from apps/api; and the code isn't in Cellix's context/entity folders yet. Minor: `tag=` with an empty value still returns the whole catalog. |
| Final Rubric Score | 85 / 100 |
| Recommendation | Continue. Next iteration: let the hook keep the lockfile in sync, and add a Cellix slice skill for layering and injection. |

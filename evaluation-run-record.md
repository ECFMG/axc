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
| Run Type | Baseline |
| Harness Engineering Used | None. No AGENTS.md, hooks, rules, sub-agents or MCP. Only the portless and turborepo skills that are already on main. Default Codex permissions (workspace sandbox, ask for approval, no network). I turned off the GitHub plugin in my user config and will keep it off for every run. |
| Config / Diff Notes | djh-oai-0 is main (9c890d7) plus one security commit from me (d5f1f89) that bumps hono to 4.13.11 for SNYK-JS-HONO-20883336, as Nick suggested. Before that commit verify failed only on Snyk; after it, verify passed. I ran the task in a fresh worktree and pasted task-set-a-prompt.md as is. The agent changed 11 files (+458/-1), all inside the write boundary. No lockfile or packages/cellix changes. I committed its output untouched with --no-verify, because the pre-commit verify fails on Knip (see below). |
| Branch / Commit | djh-oai-0-a-out @ `f452e31` |
| Requirements Completed / Attempted | 11 / 11 |
| Acceptance Criteria Passed / Total | 12 / 12 |
| Tests Passed / Failed | 585 passed / 0 failed (41 new node:test cases + 544 existing unit tests). 1/1 Serenity scenario (existing healthcheck only), 19/19 architecture tests. No new Serenity scenarios. |
| Static Analysis / Security Findings | 0 critical, 0 high, 0 medium new findings. Snyk clean (23 projects); pnpm audit same as the start commit. Knip fails on one unused exported type, so pnpm run verify is red. Biome, typecheck, build, e18e and arch tests pass. No secrets, no boundary violations. |
| Input Tokens | 891,456 |
| Cached Tokens | 839,296 |
| Output Tokens | 9,324 |
| Total Tokens or Credits Used | 900,780 tokens; 0 of 1,875 monthly credits (covered by the seat) |
| Estimated Cost | $0.28 at API list price ($2 input / $0.10 cached / $10 output per 1M) |
| Elapsed Time | 8 min 51 sec |
| Number of Human Interventions / Redirects | 1 (approved one command, `git switch -c`, so the agent could create its branch; no steering or corrections) |
| Reviewer Notes | The feature itself works. Everything I tried behaves as the spec says: default list, keyword, each filter, the combined query, paging, sorting, the 400 error format, an oversized page number, and no-match. The problems are around it. The agent never ran the full verify, so it missed an unused export that fails Knip. It couldn't start the Functions host inside the sandbox, so instead of Serenity scenarios it wrote node:test files that call the Hono app directly, which the scaffold rules don't allow. The model, seed data and query logic all sit in application-services, and domain and persistence aren't used, so it doesn't follow the Cellix layout. It also added two turbo.json files and a test script nobody asked for. Minor: `tag=` with an empty value returns the whole catalog. Cost and speed were very good. |
| Final Rubric Score | 78 / 100 |
| Recommendation | Continue. Baseline recorded; next iterations should fix the verify gate, the acceptance tests and the Cellix layering. |


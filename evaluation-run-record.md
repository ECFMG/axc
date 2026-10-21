### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field | Value |
| --- | --- |
| Team | xAI |
| Developer / Operator | Mohit Gupta (SCORE operator); record by Eval Runner |
| Reviewer | (leave blank for now) |
| Harness | Grok Build + mog-xai-1 harness 6a10909 (6a10909a1ac614e546f4786d649b932cf7da5c1a) |
| Model | grok-4.7-build |
| License / Plan | |
| Codebase | ECFMG/axc |
| Task Set | A (TS-A-CATALOG-SEARCH) |
| Run Type | Harness Engineering Iteration (round 11, harness 6a10909) — run 2 of 3 |
| Harness Engineering Used | Round 11: knip in the first check; batched ≤3-read guideline. Plus round 9/10 (check then commit immediately, size-based edit rule, lint cheat-sheet, flat-layout feature skeletons + query-validation rules), AGENTS.md ordered recipe, never touch eval/score docs, husky verify gate incl. AC coverage. Grok memory + open-pencil MCP off; memory-v2 topics quarantined. Fresh worktree mog-xai-1-a-out-14. |
| Config / Diff Notes | Contamination: clean (no memory, no cellixjs, no dist/ or node_modules reads, no prior-run tags/branches/git show). Agent did not read or edit this record, eval/score docs, harness or config (knip.json, biome.json, package.json, lockfile, .husky unchanged); no .skip/.only, biome-ignore, ts-ignore or bypass added. 6 pre-write calls (3 core + 3 extra), one write batch, first check green, commit gate green first try; no repairs. Cache 78.3% (uncached 69.8k, normal range; lower % from fewer calls). Meter source: Grok Build `/usage`; session 01a15d4b-d7a9-7bc3-ac0b-b7ca3551fcc3, 2026-10-21 03:10–03:17 America/New_York. Total 350,587 = Input 322,220 (cached 252,416 inside Input) + Output 28,367 (reasoning 18,083). 10 model calls; API 4m56s. Date 2026-10-21. |
| Branch / Commit | mog-xai-1-a-out-14 / feature a8aaa36e8f8c6ad46ab38d8f6081eaaa82d32a4b; start 6a10909a1ac614e546f4786d649b932cf7da5c1a |
| Requirements Completed / Attempted | 11/11 |
| Acceptance Criteria Passed / Total | 12/12 (each A-AC1–A-AC12 has a tagged passing acceptance scenario with real assertions; AC coverage gate green) |
| Tests Passed / Failed | Acceptance 13/13 (12 course-catalog + 1 healthcheck), 0 failed; unit courses.test.ts 7 cases + existing; arch turbo tasks green; husky `pnpm run verify` passed. |
| Static Analysis / Security Findings | biome/knip/typecheck/build green via verify; pnpm audit pre-existing only; Snyk SKIPPED (CLI not on PATH, non-blocking) |
| Input Tokens | 322220 |
| Cached Tokens | 252416 (inside Input) |
| Output Tokens | 28367 (reasoning 18083) |
| Total Tokens or Credits Used | 350587 |
| Estimated Cost | $0.1482 |
| Elapsed Time | API 4m56s (Grok Build `/usage`); 10 model calls |
| Number of Human Interventions / Redirects | 0 |
| Reviewer Notes | (leave blank for now) |
| Final Rubric Score | (leave blank for now) |
| Recommendation | Continue (run 2 of 3) — PASS, best run so far (below Dhaval 604,810, old run 676,311 and a-out-5 419,770); judge tip on median of 3 |

### Grok Build `/usage` paste checklist (SCORE meter)

Mohit-confirmed path: fresh Grok Build session → unmodified TS-A → run **`/usage`** once before close → fill the five fields above. Do **not** invent numbers. Do **not** use RTK/Headroom/transcript length as substitutes.

| Paste from `/usage` | Into record field |
| --- | --- |
| Input | Input Tokens |
| Cached (or cache-read) | Cached Tokens — if absent: `n/a` + reason only for that field |
| Output | Output Tokens |
| Total | Total Tokens or Credits Used |
| Cost (or credits USD) | Estimated Cost |

Also set Config / Diff Notes: meter source `Grok Build /usage` + session timestamp (America/New_York). Full procedure: [`docs/score-metering.md`](docs/score-metering.md). Operator steps: [`docs/harness-cost-usage.md`](docs/harness-cost-usage.md).

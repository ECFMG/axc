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


### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field | Value |
| --- | --- |
| Team | Anthropic |
| Developer / Operator | Seven Thomas |
| Reviewer | (leave blank for now) |
| Harness | Claude Code (VS Code extension, auto mode) |
| Model | Claude Opus 5.5 (`claude-opus-5-5`) |
| License / Plan | _(operator to fill)_ |
| Codebase | ECFMG/axc |
| Task Set | B (TS-B-COURSE-ENROLLMENT-WORKFLOW), started from a clean branch without Task Set A, so A's course search was built in the same run |
| Run Type | Harness Engineering Iteration 2 _(operator to confirm)_ |
| Harness Engineering Used | `CLAUDE.md` (layer map, feature checklist, hard rules, summary format); `axc-feature` skill with a validated reference slice; hooks: task-context (records the task set and lists its acceptance-criterion IDs), guard-edit / guard-bash (write boundary, config and secret protection), post-edit Biome formatting, Stop hook (boundary + traceability + `pnpm run verify` on the final code); arch suite (Cellix conventions, layer imports, Hono↔Azure route parity, composition root, requirement traceability); security baseline so pre-existing audit/Snyk findings don't fail the gate |
| Config / Diff Notes | No config, harness, CI or vendored Cellix changes. Vitest configs for domain, persistence and rest copied byte for byte from application-services. Only workspace/catalog dependencies added (no new third-party packages). 42 files changed under `apps/api`, `apps/docs`, `packages/axc/*`, `packages/axc-verification/*` |
| Branch / Commit | Branch `st-ant-2-a-out`, uncommitted working tree on base `df66c2c` |
| Requirements Completed / Attempted | 20 / 20 (4 course + 16 enrollment requirements in the prompt; B1–B17 in the requirements file) |
| Acceptance Criteria Passed / Total | 15 / 15 (B-AC1–B-AC15) |
| Tests Passed / Failed | 309 passed / 0 failed: unit 162 (domain 35, persistence 20, application-services 39, rest 68), arch 108, Serenity/Cucumber acceptance 39 scenarios (15 course, 23 enrollment, 1 health) |
| Static Analysis / Security Findings | Biome, typecheck, knip, e18e clean. `pnpm audit` reports 6 findings (5 moderate, 1 high, 1 ignored); all were present before the run and none were introduced. Snyk ran (not skipped) and found no vulnerable paths |
| Input Tokens | 216,980 (130 uncached + 216,850 cache writes, 1-hour TTL) |
| Cached Tokens | 10,167,279 (cache reads) |
| Output Tokens | 106,480 (includes 19,745 thinking tokens) |
| Total Tokens or Credits Used | 10,490,739 tokens over 65 model calls |
| Estimated Cost | ≈ $5.90 at Opus 5.5 API list prices ($4/M input, $8/M 1-hour cache write, $0.20/M cache read, $20/M output): $0.0005 + $1.73 + $2.03 + $2.13 |
| Elapsed Time | ≈ 20 min 05 s (12:55:40 to 13:15:45 UTC, 2026-10-22), first prompt to final summary |
| Number of Human Interventions / Redirects | 0 (one task prompt, no corrections) |
| Reviewer Notes | (leave blank for now) |
| Final Rubric Score | 4.35 / 5 (87%) |
| Recommendation | (leave blank for now) |
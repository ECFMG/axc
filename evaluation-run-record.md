### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field                                     | Value                                                       |
|-------------------------------------------|-------------------------------------------------------------|
| Team                                      | Anthropic                                                   |
| Developer / Operator                      | Ethan Burr                                                          |
| Reviewer                                  | (leave blank for now)                                       |
| Harness                                   | Claude Code                                                 |
| Model                                     | claude-opus-5                                               |
| License / Plan                            | Claude Enterprise                                           |
| Codebase                                  | ECFMG/axc                                                   |
| Task Set                                  | A                                                           |
| Run Type                                  | Harness Engineering Iteration 1                             |
| Harness Engineering Used                  | CLAUDE.md (68 lines): write-boundary traps, package reuse list, gate costs, evidence table, prose budget |
| Config / Diff Notes                       | Config-only from esb-ant-0; config branch esb-ant-1 @ e700124. Prompt verbatim, headless, bypassPermissions, model pinned claude-opus-5. Run measured on base fe47c38; main (238fd21, pnpm 11.11.0) merged in afterwards as instructed. ARM STATS n=1 — NOT REPLICATED; 71,916 sits inside the baseline range (60,440-98,010), so no token effect is demonstrated. Domain-layer bullet was added after observing a baseline failure, so this arm had information the baseline did not. Record commits use --no-verify: the branch's code was verified by a cold full-chain run (turbo cache cleared), which is stronger evidence than husky's warm-cache run — a warm cache produced a false green on this repo earlier. |
| Branch / Commit                           | esb-ant-1-a-out / 726481f                                   |
| Requirements Completed / Attempted        | 12 / 12 (static inspection; behaviour not probed over HTTP) |
| Acceptance Criteria Passed / Total        | 10 / 10 objectively checked over HTTP by evals/acceptance_probe.py against the real Functions host (12 defined; A-AC10 delegated to the verify gate, A-AC11 counted not judged). Repo acceptance suite: 12 cucumber scenarios |
| Tests Passed / Failed                     | 699 passed / 0 failed (85 files); verify exit 0 cold        |
| Static Analysis / Security Findings       | Snyk SKIPPED (not a pass) — CLI shadowed; org 'agentcourses' 404s for this account. Scan without --org: 23 projects, 0 vulnerable paths. 1 write-boundary violation: pnpm-lock.yaml (added vitest). |
| Input Tokens                              | 112                                                         |
| Cached Tokens                             | 7,139,520 read / 153,291 created                            |
| Output Tokens                             | 71,916                                                      |
| Total Tokens or Credits Used              | 225,319 (excl. cache reads)                                 |
| Estimated Cost                            | $6.90                                                       |
| Elapsed Time                              | 18 min                                                      |
| Number of Human Interventions / Redirects | 0                                                           |
| Reviewer Notes                            | (leave blank for now)                                       |
| Final Rubric Score                        | (leave blank for now)                                       |
| Recommendation                            | Remediate                                                   |

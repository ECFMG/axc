### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field                                     | Value                                                          |
|-------------------------------------------|----------------------------------------------------------------|
| Team                                      | Anthropic                                                      |
| Developer / Operator                      | esb                                                            |
| Reviewer                                  | esb (self-scored per ACH SRD Appendix 1)                       |
| Harness                                   | Claude Code                                                    |
| Model                                     | claude-opus-5                                                  |
| License / Plan                            | Claude Enterprise                                              |
| Codebase                                  | ECFMG/axc                                                      |
| Task Set                                  | A                                                              |
| Run Type                                  | Harness Engineering Iteration 2                                |
| Harness Engineering Used                  | Iteration 1 CLAUDE.md + PreToolUse write-boundary guard hook (.claude/, 359 lines): denies writes outside the 10 prompt-declared globs and denies dependency-adding commands |
| Config / Diff Notes                       | Config-only from esb-ant-1; config branch esb-ant-2 @ e999852. Prompt verbatim, headless, bypassPermissions, model pinned claude-opus-5. Run measured on base fe47c38; main (238fd21, pnpm 11.11.0) merged in afterwards as instructed. ARM STATS n=7, runs interleaved with the baseline so time cannot align with config: mean 54,507 output (range 48,202-68,067) vs baseline mean 79,756 (range 60,440-98,010) = -31.7%. Guard recorded 0 permission denials in every run: the effect is replicated but the mechanism is NOT the hook blocking anything. Record commits use --no-verify: the branch's code was verified by a cold full-chain run (turbo cache cleared), which is stronger evidence than husky's warm-cache run — a warm cache produced a false green on this repo earlier. |
| Branch / Commit                           | esb-ant-2-a-out / d39de83                                      |
| Requirements Completed / Attempted        | 12 / 12 (static inspection; behaviour not probed over HTTP)    |
| Acceptance Criteria Passed / Total        | Not probed. Repo acceptance suite green: 19 cucumber scenarios |
| Tests Passed / Failed                     | 624 passed / 0 failed (79 files); verify exit 0 cold           |
| Static Analysis / Security Findings       | Snyk SKIPPED (not a pass) — CLI shadowed; org 'agentcourses' 404s for this account. Scan without --org: 23 projects, 0 vulnerable paths. 0 write-boundary violations; arm 0/7 runs violated the boundary vs baseline 6/6. |
| Input Tokens                              | 78                                                             |
| Cached Tokens                             | 3,752,615 read / 121,324 created                               |
| Output Tokens                             | 54,249                                                         |
| Total Tokens or Credits Used              | 175,651 (excl. cache reads)                                    |
| Estimated Cost                            | $4.45                                                          |
| Elapsed Time                              | 12 min                                                         |
| Number of Human Interventions / Redirects | 0                                                              |
| Reviewer Notes                            | FC 4: 12/12, verify green; acceptance not probed. Test 4: 624 pass / 0 fail cold; snyk SKIPPED. Arch 3: output collapses into application-services + rest and never uses the domain or persistence layers the repo is built around — the baseline did use them, so this is a regression in codebase alignment. Sec 4: 0 boundary violations in 7/7 runs vs baseline 6/6; snyk still SKIPPED so not a 5. HEE 5: improvement in cost, speed and repeatability — n=7 interleaved with the baseline, mean 54,507 vs 79,756 (-31.7%), elapsed 12 vs 18 min, spread 20% vs 62%. Cost 5: -31.7% output, $5.08 vs $7.99. Workflow 5: 0 interventions, fastest consistent arm. Vendor 4. Honest caveat: the write-boundary guard recorded 0 permission denials in every run, so the replicated effect is NOT the hook blocking anything; mechanism unexplained. |
| Final Rubric Score                        | 83 / 100                                                       |
| Recommendation                            | Candidate for Pilot                                            |

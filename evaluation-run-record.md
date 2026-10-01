### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field                                     | Value                                                |
|-------------------------------------------|------------------------------------------------------|
| Team                                      | Anthropic                                            |
| Developer / Operator                      | esb                                                  |
| Reviewer                                  | (leave blank for now)                                |
| Harness                                   | Claude Code                                          |
| Model                                     | claude-opus-5                                        |
| License / Plan                            | Claude Enterprise                                    |
| Codebase                                  | ECFMG/axc                                            |
| Task Set                                  | A                                                    |
| Run Type                                  | Harness Engineering Iteration 3                      |
| Harness Engineering Used                  | Iteration 2 config + ponytail skill (build the smallest thing that passes) and caveman skill (terse reporting), both named explicitly in CLAUDE.md so they fire rather than relying on description matching |
| Config / Diff Notes                       | Config-only from esb-ant-2; config branch esb-ant-3 @ c0a4e70. Prompt verbatim, headless, bypassPermissions, model pinned claude-opus-5. Measured on base fe47c38; main (238fd21, pnpm 11.11.0) merged in afterwards as instructed. ARM STATS n=3, interleaved run-for-run with iteration 2 in one window: iter3 mean 35,643 (27,254-42,135) vs iter2 mean 58,593 in the same window = -39.2%, ranges separated. Thinking tokens 12,846 vs 18,344 (-30%), which is the predicted mechanism. Caveman is UNATTRIBUTED: prose was measured at 2.6% of output, so it cannot account for the gain; an ablation to isolate ponytail was started and lost to operator error, not yet repeated. Record commit uses --no-verify; branch code was verified by a cold full-chain run. |
| Branch / Commit                           | esb-ant-3-a-out-repj1 / a70d069                      |
| Requirements Completed / Attempted        | 12 / 12 (static inspection; 12/12 in all three runs) |
| Acceptance Criteria Passed / Total        | 10 / 10 objectively checked over HTTP by evals/acceptance_probe.py against the real Functions host (12 defined; A-AC10 delegated to the verify gate, A-AC11 counted not judged). Repo acceptance suite: 15 cucumber scenarios (arm range 8-16 vs iteration 2's steady 19 — thinner and less consistent acceptance coverage) |
| Tests Passed / Failed                     | 619 passed / 0 failed; verify exit 0 cold in all three runs (619/602/593) |
| Static Analysis / Security Findings       | Snyk SKIPPED (not a pass) — CLI shadowed; org 'agentcourses' 404s for this account. Scan without --org: 23 projects, 0 vulnerable paths. 0 write-boundary violations in all three runs. |
| Input Tokens                              | 112                                                  |
| Cached Tokens                             | 5,107,583 read / 110,897 created                     |
| Output Tokens                             | 42,135                                               |
| Total Tokens or Credits Used              | 153,144 (excl. cache reads)                          |
| Estimated Cost                            | $4.72                                                |
| Elapsed Time                              | 10 min                                               |
| Number of Human Interventions / Redirects | 0                                                    |
| Reviewer Notes                            | (leave blank for now)                                |
| Final Rubric Score                        | (leave blank for now)                                |
| Recommendation                            | Candidate for Pilot                                  |

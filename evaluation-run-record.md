### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field                                     | Value                                                     |
|-------------------------------------------|-----------------------------------------------------------|
| Team                                      | Anthropic                                                 |
| Developer / Operator                      | esb                                                       |
| Reviewer                                  | (leave blank for now)                                     |
| Harness                                   | Claude Code                                               |
| Model                                     | claude-opus-5                                             |
| License / Plan                            | Claude Enterprise                                         |
| Codebase                                  | ECFMG/axc                                                 |
| Task Set                                  | A                                                         |
| Run Type                                  | Harness Engineering Iteration 5                           |
| Harness Engineering Used                  | Iteration 4 config (CLAUDE.md + write-boundary guard + ponytail/caveman + axc-orientation map) + a Stop-hook acceptance-coverage gate: refuses to finish while the acceptance features cover fewer scenarios than the task's acceptance-criteria table. Criteria are read from the ONE task-set-*-requirements.md whose ids the features name; a block lists the uncovered criteria with their requirement text; the same script is an agent-runnable self-check (--check) that prints uncovered criteria; the orientation map tells the agent to tag each scenario with its criterion id and self-check before finishing. Max 2 blocks per session, fail-open. |
| Config / Diff Notes                       | Config-only from esb-ant-4; config branch esb-ant-5 @ e9a9c96 (3 files, 123 lines). Prompt = repo task-set-a-prompt.md verbatim; headless, bypassPermissions, model pinned claude-opus-5. n=3, interleaved same-window with n=2 controls running a count-only draft of this gate. Scenarios: 12/12/12, all id-tagged (iteration 4: 5-17). Gate blocks: 0/0/0 vs 2 every control run — agents ran --check unprompted and met the bar before first stop. Cost: $2.08 mean ($1.64-2.40) vs $2.56 control (-19%), $2.61 iteration 4 (-20%), $7.99 baseline (-74%). Two discarded drafts (count-only +22%; named gaps on an unsatisfiable bar +28%) show scoping + self-check is the gain. Base fe47c38 with main 238fd21 merged. Record commit --no-verify; code verified cold: verify exit 0, 12/12 requirements, 10/10 HTTP probe. |
| Branch / Commit                           | esb-ant-5-a-out-x1 / 160926c                              |
| Requirements Completed / Attempted        | 12 / 12 (static inspection; 12/12 in all three runs)      |
| Acceptance Criteria Passed / Total        | 10 / 10 objectively checked over HTTP by evals/acceptance_probe.py against the real Functions host (12 defined; A-AC10 delegated to the verify gate, A-AC11 counted not judged). Repo acceptance suite: 13 cucumber scenarios (12 new, one per criterion, each named by its criterion id, plus the shipped healthcheck) in all three runs |
| Tests Passed / Failed                     | verify exit 0 cold; all unit/arch/acceptance suites green |
| Static Analysis / Security Findings       | Snyk SKIPPED (not a pass) — CLI shadowed; org 'agentcourses' 404s for this account. Scan without --org: 23 projects, 0 vulnerable paths. 0 write-boundary violations in all three runs. |
| Input Tokens                              | 56                                                        |
| Cached Tokens                             | 1,587,714 read / 74,154 created                           |
| Output Tokens                             | 34,534                                                    |
| Total Tokens or Credits Used              | 108,744 (excl. cache reads)                               |
| Estimated Cost                            | $2.40                                                     |
| Elapsed Time                              | 8 min                                                     |
| Number of Human Interventions / Redirects | 0                                                         |
| Reviewer Notes                            | (leave blank for now)                                     |
| Final Rubric Score                        | (leave blank for now)                                     |
| Recommendation                            | Candidate for Pilot                                       |

### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field                                     | Value                                                     |
|-------------------------------------------|-----------------------------------------------------------|
| Team                                      | Anthropic                                                 |
| Developer / Operator                      | Ethan Burr                                                |
| Reviewer                                  | (leave blank for now)                                     |
| Harness                                   | Claude Code                                               |
| Model                                     | claude-opus-5                                             |
| License / Plan                            | Claude Enterprise                                         |
| Codebase                                  | ECFMG/axc                                                 |
| Task Set                                  | B                                                         |
| Run Type                                  | Baseline                                                  |
| Harness Engineering Used                  | None — baseline. Default Claude Code, no CLAUDE.md, no .claude configuration, prompt = repo task-set-b-prompt.md verbatim, headless, bypassPermissions, model pinned claude-opus-5. |
| Config / Diff Notes                       | Baseline for Task Set B on main 9c890d7 (config branch esb-ant-0 = main, no harness), n=1. Functionally green: verify exit 0 cold including real snyk and pnpm audit; 16 acceptance scenarios against 15 B-AC criteria (not id-tagged). WRITE-BOUNDARY VIOLATED: the agent edited 4 package.json files (domain, persistence, application-services, rest) and pnpm-lock.yaml to wire tests and cross-layer imports — the same scaffold gap measured in 6/6 Task A baseline runs; Task B additionally needs rest wiring the Task A scaffold fix does not cover. Diff 57 files, +3,265 lines. Usage from transcript, agrees with result JSON. Comparison: Task A baseline $6.91 / 70,171 out / 18 min — Task B is ~1.6x on every axis. |
| Branch / Commit                           | esb-ant-0-b-out / 39afe02                                 |
| Requirements Completed / Attempted        | Functional requirements implemented per verify (not independently probed over HTTP; no Task B probe exists yet) |
| Acceptance Criteria Passed / Total        | 16 cucumber scenarios pass in the repo suite against 15 defined B-AC criteria; per-criterion HTTP probing not performed (evals probe covers Task A only) |
| Tests Passed / Failed                     | verify exit 0 cold; all unit/arch/acceptance suites green |
| Static Analysis / Security Findings       | Snyk: no vulnerable paths (real CLI). pnpm audit green. Write-boundary VIOLATIONS: pnpm-lock.yaml + 4 package.json files edited mid-task (see Config/Diff Notes). |
| Input Tokens                              | 172                                                       |
| Cached Tokens                             | 11,369,129 read / 216,538 created                         |
| Output Tokens                             | 118,929                                                   |
| Total Tokens or Credits Used              | 335,639 (excl. cache reads)                               |
| Estimated Cost                            | $10.83                                                    |
| Elapsed Time                              | 28 min                                                    |
| Number of Human Interventions / Redirects | 0                                                         |
| Reviewer Notes                            | (leave blank for now)                                     |
| Final Rubric Score                        | (leave blank for now)                                     |
| Recommendation                            | Continue — baseline reference; boundary violation to be remediated by harness (scaffold pre-wiring, as in Task A iteration 6) |

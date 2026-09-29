### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field                                     | Value                                                          |
|-------------------------------------------|----------------------------------------------------------------|
| Team                                      | OpenAI / Anthropic / Cursor / xAI / Antigravity                |
| Developer / Operator                      | esb                                                            |
| Reviewer                                  | (leave blank for now)                                          |
| Harness                                   | Claude Code                                                    |
| Model                                     | claude-opus-5                                                  |
| License / Plan                            | Claude Enterprise                                              |
| Codebase                                  | ECFMG/axc                                                      |
| Task Set                                  | A                                                              |
| Run Type                                  | Harness Engineering Iteration 2                                |
| Harness Engineering Used                  | Iteration 1 CLAUDE.md + PreToolUse write-boundary guard hook (.claude/, 359 lines): denies writes outside the 10 prompt-declared globs and denies dependency-adding commands |
| Config / Diff Notes                       | Config branch esb-ant-2 @ e999852, config-only from esb-ant-1. Prompt = repo task-set-a-prompt.md verbatim. Headless, bypassPermissions. Guard recorded 0 permission denials, so the clean boundary result is not attributable to the hook blocking anything. |
| Branch / Commit                           | esb-ant-2-a-out / d39de83                                      |
| Requirements Completed / Attempted        | 12 / 12 (static inspection; behaviour not probed over HTTP)    |
| Acceptance Criteria Passed / Total        | Not probed. Repo acceptance suite green: 19 cucumber scenarios |
| Tests Passed / Failed                     | 624 passed / 0 failed (79 files); verify exit 0 cold           |
| Static Analysis / Security Findings       | Snyk SKIPPED (not a pass) — CLI shadowed; org 'agentcourses' 404s for this account. Scan without --org: 23 projects, 0 vulnerable paths. 0 write-boundary violations. |
| Input Tokens                              | 78                                                             |
| Cached Tokens                             | 3,752,615 read / 121,324 created                               |
| Output Tokens                             | 54,249                                                         |
| Total Tokens or Credits Used              | 175,651 (excl. cache reads)                                    |
| Estimated Cost                            | $4.45                                                          |
| Elapsed Time                              | 12 min                                                         |
| Number of Human Interventions / Redirects | 0                                                              |
| Reviewer Notes                            | (leave blank for now)                                          |
| Final Rubric Score                        | (leave blank for now)                                          |
| Recommendation                            | Continue                                                       |

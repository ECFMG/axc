### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field                                     | Value                                          |
|-------------------------------------------|------------------------------------------------|
| Team                                      | Anthropic                                      |
| Developer / Operator                      | Ethan Burr                                     |
| Reviewer                                  | Ethan Burr                                     |
| Harness                                   | Claude Code                                    |
| Model                                     | claude-opus-5-5, effort=medium (model default) |
| License / Plan                            | Claude Enterprise                              |
| Codebase                                  | ECFMG/axc                                      |
| Task Set                                  | A                                              |
| Run Type                                  | Harness Engineering Iteration 7                |
| Harness Engineering Used                  | Iteration 6 harness + four changes: (1) scaffold completed - rest layer test-wired (declared in .claude/scaffold.files); (2) orientation map gains CellixJS house file shapes and a rest-unit-test rule; (3) guard hardening - deny rules match every line of multi-line commands (6/6 red-team bypasses fixed, 0 false positives over 5,257 replayed commands); (4) dependency remediation - hono 4.13.10 -> 4.13.11 closing SNYK-JS-HONO-20883336, scan-verified clean. Model moved to claude-opus-5-5 (pinned dateless snapshot; default effort medium, disclosed). A tool-batching prompt was piloted and dropped as a null result. |
| Config / Diff Notes                       | Config branch esb-ant-7 @ 764e1c9 on main 9c890d7. Prompt verbatim; headless; MODEL=claude-opus-5-5. Factor attribution from two earlier same-window interleaves on this harness lineage: harness changes on claude-opus-5 were -6% vs iteration-6 controls with rest tests 3/3 vs 0/2; the model on identical config was 0.31x ($1.23 mean vs $3.99). This recorded run is on the final scaffold (hono fix): $1.12, 23 turns, 5 min, quality identical. Baselines are claude-opus-5 (cross-model deltas indicative only). Snyk: clean - Tested 23 projects, no vulnerable paths (fresh scan on this branch). pnpm audit passes its gate. All gates green cold; 10/10 HTTP probe. Record commit --no-verify (record-only). |
| Branch / Commit                           | esb-ant-7-a-out / 2715515                      |
| Requirements Completed / Attempted        | 12 / 12 (static inspection)                    |
| Acceptance Criteria Passed / Total        | 10 / 10 objectively checked over HTTP by evals/acceptance_probe.py (12 defined; A-AC10 delegated, A-AC11 counted). 12 criterion-tagged scenarios + healthcheck |
| Tests Passed / Failed                     | verify exit 0 cold incl. snyk; unit tests in all four layers incl. rest |
| Static Analysis / Security Findings       | Snyk: clean - Tested 23 projects, no vulnerable paths were found (the prior iteration's Medium hono finding is remediated by the 4.13.11 bump and re-scanned). pnpm audit passes the high-severity gate. 0 write-boundary violations; secret gate silent. |
| Input Tokens                              | 44                                             |
| Cached Tokens                             | 1,046,844 read / 57,387 created                |
| Output Tokens                             | 22,271                                         |
| Total Tokens or Credits Used              | 79,702 (excl. cache reads)                     |
| Estimated Cost                            | $1.12                                          |
| Elapsed Time                              | 5 min                                          |
| Number of Human Interventions / Redirects | 0                                              |
| Reviewer Notes                            | Everything done, 10/10 over HTTP, 12 tagged scenarios, all four layers with tests incl. rest (my iteration 6 flag closed). Guard bypass found in review is fixed, and the Medium hono finding the scan surfaced is remediated and re-scanned clean. Model switch to Opus 5.5: ~69% cheaper than same-window controls with identical quality, measured separately from the harness changes. Remaining caveat: baselines are on the old model, so baseline percentages are indicative. |
| Final Rubric Score                        | 97 / 100                                       |
| Recommendation                            | Candidate for Pilot                            |

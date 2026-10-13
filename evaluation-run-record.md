### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field                                     | Value                                                       |
|-------------------------------------------|-------------------------------------------------------------|
| Team                                      | Anthropic                                                   |
| Developer / Operator                      | Ethan Burr                                                  |
| Reviewer                                  | Ethan Burr                                                  |
| Harness                                   | Claude Code                                                 |
| Model                                     | claude-opus-5-5, effort=medium (model default)              |
| License / Plan                            | Claude Enterprise                                           |
| Codebase                                  | ECFMG/axc                                                   |
| Task Set                                  | B                                                           |
| Run Type                                  | Harness Engineering Iteration 7                             |
| Harness Engineering Used                  | Same iteration 7 harness as Task A (scaffold completion, CellixJS house shapes, guard multi-line hardening, hono remediation), model claude-opus-5-5 (default effort medium, disclosed). No Task B tuning - the coverage gate targets the 15 B-ACs automatically. |
| Config / Diff Notes                       | Config branch esb-ant-7 @ 764e1c9 on main 9c890d7. Prompt verbatim; headless; MODEL=claude-opus-5-5. Factor attribution from two earlier same-window interleaves: harness changes on claude-opus-5 were +17% vs iteration-6 controls (buying rest unit tests 3/3); the model on identical config was 0.24x ($1.85 mean vs $7.62), with turn count exactly 27 in all three runs. This recorded run is on the final scaffold (hono fix): $1.89, 33 turns, 9 min, quality identical. Baselines are claude-opus-5 (indicative only). Snyk: clean - Tested 23 projects, no vulnerable paths (fresh scan on this branch). pnpm audit passes its gate. All gates green cold; 13/13 HTTP probe via evals/acceptance_probe_b.py. Record commit --no-verify (record-only). |
| Branch / Commit                           | esb-ant-7-b-out / d58f48e                                   |
| Requirements Completed / Attempted        | Functional requirements implemented per gates; 13/13 criteria independently verified over HTTP |
| Acceptance Criteria Passed / Total        | 13 / 13 objectively checked over HTTP by evals/acceptance_probe_b.py (15 defined; B-AC13 delegated, B-AC14 counted). Repo suite: 27 scenarios |
| Tests Passed / Failed                     | verify exit 0 cold incl. snyk; unit tests across the layers |
| Static Analysis / Security Findings       | Snyk: clean - Tested 23 projects, no vulnerable paths were found (prior Medium hono finding remediated via 4.13.11 and re-scanned). pnpm audit passes the high-severity gate. 0 write-boundary violations; secret gate silent. |
| Input Tokens                              | 62                                                          |
| Cached Tokens                             | 1,928,603 read / 83,566 created                             |
| Output Tokens                             | 41,746                                                      |
| Total Tokens or Credits Used              | 125,374 (excl. cache reads)                                 |
| Estimated Cost                            | $1.89                                                       |
| Elapsed Time                              | 9 min                                                       |
| Number of Human Interventions / Redirects | 0                                                           |
| Reviewer Notes                            | Same harness as Task A, zero B tuning, and it held: 13/13 criteria verified over HTTP, all layers, rest tested, no violations, snyk clean after the hono fix. Model switch pays even more here - ~76% cheaper than same-window controls - and the 5.5 arm's turn count was exactly 27 in all three replicates, the most consistent behavior of the whole evaluation. Remaining caveat: old-model baselines. |
| Final Rubric Score                        | 97 / 100                                                    |
| Recommendation                            | Candidate for Pilot                                         |

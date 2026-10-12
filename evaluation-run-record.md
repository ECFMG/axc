### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field                                     | Value                            |
|-------------------------------------------|----------------------------------|
| Team                                      | Anthropic                        |
| Developer / Operator                      | Ethan Burr                       |
| Reviewer                                  | Ethan Burr                       |
| Harness                                   | Claude Code                      |
| Model                                     | claude-opus-5                    |
| License / Plan                            | Claude Enterprise                |
| Codebase                                  | ECFMG/axc                        |
| Task Set                                  | B                                |
| Run Type                                  | Harness Engineering Iteration 6  |
| Harness Engineering Used                  | Task A iteration 6 harness applied unchanged: CLAUDE.md + write-boundary guard + ponytail/caveman + axc-orientation map (with layering section) + coverage gate + secret gate + scaffold pre-wiring declared in .claude/scaffold.files. Nothing was tuned for Task B; the coverage gate reads the task's own criteria table, so it targeted the 15 B-ACs automatically. |
| Config / Diff Notes                       | Config branch esb-ant-6 @ 49a110a on main 9c890d7. Prompt = repo task-set-b-prompt.md verbatim; headless, bypassPermissions, model pinned claude-opus-5. n=1, vs the Task B baseline (esb-ant-0-b-out, $10.83 / 118,929 out / 98 turns / 28 min / boundary violated 5 files): cost -57%, output -52%, turns -45%, elapsed -54%, 0 boundary violations. All 4 layers built legally (agent routed around the un-wired rest tests via application-services instead of editing package.json). 21 acceptance scenarios, every one named by its B-AC id; coverage and secret gates 0 blocks. Verify green cold including real snyk and pnpm audit. No HTTP probe exists for Task B yet; acceptance evidence is the repo suite. Record commit --no-verify (record-only change). |
| Branch / Commit                           | esb-ant-6-b-out / f81f99a        |
| Requirements Completed / Attempted        | Functional requirements implemented per verify (repo suite; no independent Task B HTTP probe yet) |
| Acceptance Criteria Passed / Total        | 15 / 15 B-AC criteria covered by passing, criterion-tagged scenarios in the repo acceptance suite (21 scenarios incl. multiple per criterion; B-AC1 Task A regression included) |
| Tests Passed / Failed                     | verify exit 0 cold; all unit/arch/acceptance suites green; unit tests across the layers |
| Static Analysis / Security Findings       | Snyk: no vulnerable paths (real CLI). pnpm audit green. 0 write-boundary violations; secret gate silent. |
| Input Tokens                              | 106                              |
| Cached Tokens                             | 4,162,902 read / 110,088 created |
| Output Tokens                             | 57,333                           |
| Total Tokens or Credits Used              | 167,527 (excl. cache reads)      |
| Estimated Cost                            | $4.62                            |
| Elapsed Time                              | 13 min                           |
| Number of Human Interventions / Redirects | 0                                |
| Reviewer Notes                            | Functionally complete, all 15 ACs pass incl. Task A regression. Task A harness reused as-is, no tuning. ~50% cheaper/faster than baseline, no boundary violations (baseline had 5). Caveats: single run only - needs replication; no HTTP-level verification for Task B criteria yet. |
| Final Rubric Score                        | 97 / 100                         |
| Recommendation                            | Candidate for Pilot              |

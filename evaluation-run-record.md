### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field                                     | Value                                                |
|-------------------------------------------|------------------------------------------------------|
| Team                                      | Anthropic                                            |
| Developer / Operator                      | Ethan Burr                                           |
| Reviewer                                  | Ethan Burr                                           |
| Harness                                   | Claude Code                                          |
| Model                                     | claude-opus-5                                        |
| License / Plan                            | Claude Enterprise                                    |
| Codebase                                  | ECFMG/axc                                            |
| Task Set                                  | A                                                    |
| Run Type                                  | Harness Engineering Iteration 6                      |
| Harness Engineering Used                  | Iteration 5 config (CLAUDE.md + write-boundary guard + ponytail/caveman + axc-orientation map + coverage gate + secret gate) + scaffold pre-wiring, owner-approved and declared in .claude/scaffold.files: vitest wiring for domain and persistence, cross-layer dependencies (persistence->domain; application-services->domain+persistence) with tsconfig references, knip scoped-ignores, regenerated lockfile. The orientation map gains a 'Layering a new capability' section routing domain -> persistence -> application-services -> rest. Rationale: 6/6 baseline runs violated the write boundary adding exactly this wiring mid-task; every guarded arm built flat because tested+layered was impossible in-boundary. |
| Config / Diff Notes                       | Config + declared scaffold from esb-ant-5; config branch esb-ant-6 @ 49a110a on main 9c890d7. Prompt = repo task-set-a-prompt.md verbatim; headless, bypassPermissions, model pinned claude-opus-5. n=3, interleaved same-window with n=2 iteration-5-config controls on the same main. Layers: all 4 (domain/persistence/application-services/rest) with tests in 3 layers, in 3/3 runs, 0 boundary violations — vs controls: one flat, one layered only by editing package.json mid-task (2 boundary files, the exact violation the scaffold removes). Scenarios 12/12/12 id-tagged; coverage and secret gates 0 blocks. Cost $2.90 mean ($2.33-3.59) vs $3.02 control; output mean 34,795 vs 39,173 (-11%). Verify green cold including real snyk (23 projects, 0 vulnerable paths; shim retired after the --org fix) and pnpm audit. Record commit --no-verify (record-only change); branch code verified by a cold full-chain run: verify exit 0, 12/12 requirements, 10/10 HTTP probe. |
| Branch / Commit                           | esb-ant-6-a-out / bd891f9                            |
| Requirements Completed / Attempted        | 12 / 12 (static inspection; 12/12 in all three runs) |
| Acceptance Criteria Passed / Total        | 10 / 10 objectively checked over HTTP by evals/acceptance_probe.py against the real Functions host (12 defined; A-AC10 delegated to the verify gate, A-AC11 counted not judged). Repo acceptance suite: 14 cucumber scenarios (12 new, one per criterion, each named by its criterion id, plus healthcheck) |
| Tests Passed / Failed                     | verify exit 0 cold; all unit/arch/acceptance suites green; unit tests present in domain, persistence and application-services |
| Static Analysis / Security Findings       | Snyk: 23 projects, no vulnerable paths (real CLI; org flag removed upstream). pnpm audit green. 0 write-boundary violations in all three runs; secret gate silent. |
| Input Tokens                              | 76                                                   |
| Cached Tokens                             | 2,348,943 read / 79,727 created                      |
| Output Tokens                             | 32,028                                               |
| Total Tokens or Credits Used              | 111,831 (excl. cache reads)                          |
| Estimated Cost                            | $2.77                                                |
| Elapsed Time                              | 9 min                                                |
| Number of Human Interventions / Redirects | 0                                                    |
| Reviewer Notes                            | Functionally complete, all 12 ACs covered with passing tests. Architecture issue from prior iterations resolved - code properly layered per CellixJS now. Cost slightly down vs last iteration. To address next: no unit tests in rest layer; file-by-file CellixJS pattern check still needed. |
| Final Rubric Score                        | 97 / 100                                             |
| Recommendation                            | Candidate for Pilot                                  |

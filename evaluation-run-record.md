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
| Run Type                                  | Baseline                                                       |
| Harness Engineering Used                  | None — no CLAUDE.md, no .claude/; launched with --setting-sources '' so neither repo nor user config was visible |
| Config / Diff Notes                       | Prompt = repo task-set-a-prompt.md verbatim. Headless, bypassPermissions, model pinned claude-opus-5. Base pinned at fe47c38; origin/main has since moved to 238fd21 (pnpm 11.9.0->11.11.0). Not rebased: a package-manager patch cannot plausibly change the measurement and rebasing would invalidate every comparable run. ARM STATS (n=6, incl. runs interleaved with other arms so time cannot align with config): mean 79,756 output, range 60,440-98,010 (62% spread), mean cost $7.99. This record's own run is the arm's second-lowest; the arm mean is the fair comparator. |
| Branch / Commit                           | esb-ant-0-a-out / e32e704                                      |
| Requirements Completed / Attempted        | 12 / 12 (static inspection; behaviour not probed over HTTP)    |
| Acceptance Criteria Passed / Total        | Not probed. Repo acceptance suite green: 22 cucumber scenarios |
| Tests Passed / Failed                     | 653 passed / 0 failed (81 files); verify exit 0 cold           |
| Static Analysis / Security Findings       | Snyk SKIPPED (not a pass) — CLI shadowed; org 'agentcourses' 404s for this account. Scan without --org: 23 projects, 0 vulnerable paths. 1 write-boundary violation: pnpm-lock.yaml (added vitest, pulling axios and proxy agents). Arm: 6/6 runs violated the boundary. |
| Input Tokens                              | 114                                                            |
| Cached Tokens                             | 7,061,829 read / 162,888 created                               |
| Output Tokens                             | 70,171                                                         |
| Total Tokens or Credits Used              | 233,173 (excl. cache reads)                                    |
| Estimated Cost                            | $6.91                                                          |
| Elapsed Time                              | 18 min                                                         |
| Number of Human Interventions / Redirects | 0                                                              |
| Reviewer Notes                            | FC 4: 12/12 requirements implemented, verify green; not 5 because acceptance criteria were never probed over HTTP. Test 4: 653 pass / 0 fail cold, but snyk SKIPPED (org access), so validation is incomplete. Arch 4: work correctly spread across domain, persistence, application-services and rest. Sec 3: lockfile written outside the task boundary in 6/6 runs (added vitest), snyk not run. HEE 3: SRD neutral score for a baseline. Cost 3: arm mean 79,756 output / $7.99, range 60,440-98,010 (62% spread). Workflow 4: 0 interventions, headless, but least predictable arm. Vendor 4: Claude Enterprise, admin controls clear; Copilot remains the approved production standard. |
| Final Rubric Score                        | 73 / 100                                                       |
| Recommendation                            | Continue                                                       |

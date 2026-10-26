### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field                                     | Value                           |
|-------------------------------------------|---------------------------------|
| Team                                      | Anthropic                       |
| Developer / Operator                      | Ethan Burr                      |
| Reviewer                                  | Ethan Burr                      |
| Harness                                   | Claude Code                     |
| Model                                     | claude-opus-5-5, effort=low     |
| License / Plan                            | Claude Enterprise               |
| Codebase                                  | ECFMG/axc                       |
| Task Set                                  | B                               |
| Run Type                                  | Harness Engineering Iteration 8 |
| Harness Engineering Used                  | Iteration 7 harness + five changes: (1) scaffold pre-wires tsconfig.vitest.json into domain, persistence and rest (agents recreated it in 12/12 earlier runs, 0/5 after); (2) knip self-check CLI, advisory; (3) Cellix-shape self-check with per-module colocated tests (Task B Cellix-shaped 0/4 before, 10/10 hand-harness B runs since); (4) effortLevel low in project settings (pilot: B $1.97 -> $1.59, A ~$1.05 -> $0.90, quality held); (5) security maintenance via overrides - zod 4.6.6, happy-dom 21.0.4, serialize-javascript 7.1.3. Records now carry harness-file hashes. |
| Config / Diff Notes                       | Config branch esb-ant-8 @ 2ef0a9a on main 9c890d7. Prompt verbatim; headless; MODEL=claude-opus-5-5, effortLevel low (project setting, disclosed). Same-window interleave with generator v4 (kit tooling that rebuilds this harness automatically, not part of this config): A $1.09, B $1.45 / $1.63, Cellix PASS 3/3. Iteration 7 scores corrected: A 97 -> 99 (arithmetic slip), B 97 -> 96 (flat domain, found by the new Cellix check). Snyk clean - Tested 23 projects, no vulnerable paths. pnpm audit passes its gate. Record commit --no-verify (record-only). This run: $1.74, 27 turns, 7 min (effort-low pilot mean $1.59, n=3). Cold verify exit 0; 13/13 HTTP probe via evals/acceptance_probe_b.py. HARNESS HASHES: CLAUDE.md=1e71e76fb5, .claude=1f9317ef33, scaffold.files=0bdd8f3d9b, AGENTS.md=b93e7c1747. |
| Branch / Commit                           | esb-ant-8-b-out / 566ea3f       |
| Requirements Completed / Attempted        | 15 / 15 criteria covered by tagged scenarios (coverage gate); 13 / 13 verified over HTTP |
| Acceptance Criteria Passed / Total        | 13 / 13 objectively checked over HTTP by evals/acceptance_probe_b.py (15 defined; B-AC13 delegated, B-AC14 counted). 20 criterion-tagged scenarios; repo suite 27 scenarios |
| Tests Passed / Failed                     | verify exit 0 cold incl. snyk; 10 unit test files across all four layers incl. rest; 2 runtime modules without a colocated test |
| Static Analysis / Security Findings       | Snyk: clean - Tested 23 projects, no vulnerable paths were found. pnpm audit passes the high-severity gate (2 moderate, below threshold). 0 write-boundary violations; secret gate silent. |
| Input Tokens                              | 52                              |
| Cached Tokens                             | 1,809,394 read / 73,722 created |
| Output Tokens                             | 39,373                          |
| Total Tokens or Credits Used              | 113,147 (excl. cache reads)     |
| Estimated Cost                            | $1.74                           |
| Elapsed Time                              | 7 min                           |
| Number of Human Interventions / Redirects | 0                               |
| Reviewer Notes                            | 13/13 over HTTP, and B is now Cellix-shaped - iteration 7's B put its domain flat, the one real gap - with 10 unit test files vs 3. $1.74 and 7 min, under the $2 cap. Only dock is Vendor (org-level procurement items). |
| Final Rubric Score                        | 99 / 100                        |
| Recommendation                            | Candidate for Pilot             |

### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field                                     | Value                                             |
|-------------------------------------------|---------------------------------------------------|
| Team                                      | Anthropic                                         |
| Developer / Operator                      | Ethan Burr                                        |
| Reviewer                                  | Ethan Burr                                        |
| Harness                                   | Claude Code                                       |
| Model                                     | claude-opus-5-5, effort=low                       |
| License / Plan                            | Claude Enterprise                                 |
| Codebase                                  | ECFMG/axc                                         |
| Task Set                                  | B                                                 |
| Run Type                                  | Harness Engineering Iteration 9                   |
| Harness Engineering Used                  | Iteration 8 harness + six changes: (1) gate digest - python3 .claude/hooks/gate_digest.py runs verify once and prints every gate's result, test and scenario counts and the failing gate's error lines, so agents stop grepping the full log; (2) TypeScript strict flags and Serenity assertion rules in the orientation map; (3) Cellix-shape check enforced as a Stop hook (blocks finishing at most twice while the shape is wrong; agents ran the advisory version in 0 of 16 measured runs and one shipped flat domain code); (4) account tools and claude.ai connectors removed from the agent's context; (5) the two most repeated type-error loops mapped (query-string index access TS4111, Serenity contain vs includes); (6) security maintenance - qs 6.17.0, follow-redirects 1.16.2, smol-toml 1.9.1, uuid 11.1.1, happy-dom kept at 20.10.1 with advisory ignores that expire 2026-11-28 (patched releases break the build or are unpublished). |
| Config / Diff Notes                       | Config branch esb-ant-9 @ 0692ebe on main 9c890d7. Prompt verbatim; headless; MODEL=claude-opus-5-5, effortLevel low (project setting, disclosed). Measured against iteration 8 same-window, interleaved, n=3 per task (2026-10-28, config 66054093 = this harness before the dependency-only commit 0692ebec): A $0.75 vs $0.85 (-11%), B $1.34 vs $1.59 (-16%), combined -14%; all six iteration-9 runs cold verify exit 0, HTTP probes 10/10 and 13/13, Cellix shape PASS. Comparator esb-ant-8s = esb-ant-8 config + the same dependency maintenance (iteration 8 no longer builds from a clean checkout without it). Evidence: claude-optimizer-kit/axc-harness/evidence/esb-ant-{9,8s}-{a,b}-out-repu*.json. Recorded late: the team's earlier ~25% record bar was dropped 2026-10-30. This output is one of six same-config runs on 2026-10-30 (control arm of the iteration 10 A/B), chosen as the run closest to the six-run mean ($1.41). Snyk clean - Tested 23 projects, no vulnerable paths. pnpm audit passes its gate. Record commit --no-verify (record-only). This run: $1.40, 16 turns, 7 min. Cold verify exit 0; 13/13 HTTP probe. HARNESS HASHES: CLAUDE.md=5b67b94b32, .claude=930c368074, scaffold.files=0bdd8f3d9b, AGENTS.md=b93e7c1747. |
| Branch / Commit                           | esb-ant-9-b-out / 0c875d1                         |
| Requirements Completed / Attempted        | 15 / 15 criteria covered by tagged scenarios (coverage gate); 13 / 13 verified over HTTP |
| Acceptance Criteria Passed / Total        | 13 / 13 objectively checked over HTTP by evals/acceptance_probe_b.py (15 defined; B-AC13 delegated, B-AC14 counted). 16 scenarios cover all 15 criteria; enrollment suite 14 / 14 successful |
| Tests Passed / Failed                     | verify exit 0 cold incl. snyk; 620 unit tests in 91 files passed, 0 failed; 10 new unit test files across all four layers incl. rest; Cellix shape check OK (2 aggregates) |
| Static Analysis / Security Findings       | Snyk: clean - Tested 23 projects, no vulnerable paths were found. pnpm audit passes the high-severity gate (4 advisories, all on the expiring ignore list: 1 low, 1 moderate, 2 high). 0 write-boundary violations; vendored packages/cellix untouched; secret gate silent. |
| Input Tokens                              | 30                                                |
| Cached Tokens                             | 677,805 read / 68,184 created                     |
| Output Tokens                             | 35,773                                            |
| Total Tokens or Credits Used              | 103,987 (excl. cache reads)                       |
| Estimated Cost                            | $1.40                                             |
| Elapsed Time                              | 7 min                                             |
| Number of Human Interventions / Redirects | 0                                                 |
| Reviewer Notes                            | (leave blank for now)                             |
| Final Rubric Score                        | (leave blank for now)                             |
| Recommendation                            | Continue / Remediate / Stop / Candidate for Pilot |

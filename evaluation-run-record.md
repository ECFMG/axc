### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field                                     | Value                                               |
|-------------------------------------------|-----------------------------------------------------|
| Team                                      | Anthropic                                           |
| Developer / Operator                      | Ethan Burr                                                  |
| Reviewer                                  | (leave blank for now)                               |
| Harness                                   | Claude Code                                         |
| Model                                     | claude-opus-5                                       |
| License / Plan                            | Claude Enterprise                                   |
| Codebase                                  | ECFMG/axc                                           |
| Task Set                                  | A                                                   |
| Run Type                                  | Harness Engineering Iteration 4                     |
| Harness Engineering Used                  | Iteration 3 config (CLAUDE.md + PreToolUse write-boundary guard + ponytail + caveman skills) + axc-orientation skill: a 91-line repo map (layout, request flow, test/docs patterns, gate costs, 'do not read .claude/') derived from the repo and named in CLAUDE.md so it loads at the start of every run |
| Config / Diff Notes                       | Config-only from esb-ant-3; config branch esb-ant-4 @ 079d884. Prompt = repo task-set-a-prompt.md verbatim. Headless, bypassPermissions, model pinned claude-opus-5. Measured on base fe47c38 with main 238fd21 (pnpm 11.11.0) merged in. ARM STATS n=5, interleaved run-for-run with iteration 3 (n=4) across two batches with alternating order: cost $2.22 ($1.68-2.56) vs $3.38 ($2.62-4.74) = -34%, ranges separated; turns 28 vs 38 (-26%); cache reads 1.77M vs 3.09M (-43%); elapsed 5.0 vs 7.1 min (-30%); output 26,950 (21,673-30,452) vs 36,552 (29,822-53,576) = -26%, ranges overlap by 630 tokens so output is consistent-with, not established. Mechanism verified in transcripts: the Skill tool loaded the map in 5/5 runs, exploration turns before the first write fell from 13-17 to 2-11, and reads of .claude/ config fell to 0 (controls read it). vs pooled baseline (n=6: $7.99, 79,756 output): -72% cost, -66% output. Rationale: cost on this model is ~73% cache traffic (fit to list pricing), so this iteration targets turns and ingestion rather than output tokens, which four prior prose/hook iterations targeted and regressed. Record commit uses --no-verify; branch code verified by a cold full-chain run. |
| Branch / Commit                           | esb-ant-4-a-out / acd658b                           |
| Requirements Completed / Attempted        | 12 / 12 (static inspection; 12/12 in all five runs) |
| Acceptance Criteria Passed / Total        | 10 / 10 objectively checked over HTTP by evals/acceptance_probe.py against the real Functions host (12 defined; A-AC10 delegated to the verify gate, A-AC11 counted not judged). Repo acceptance suite: 7 cucumber scenarios (arm 5-17; iteration 3 controls 4-19 — same spread as iteration 3, not introduced here) |
| Tests Passed / Failed                     | 591 passed / 0 failed; verify exit 0 cold in all five runs (591/591/591/610/595) |
| Static Analysis / Security Findings       | Snyk SKIPPED (not a pass) — CLI shadowed; org 'agentcourses' 404s for this account. Scan without --org: 23 projects, 0 vulnerable paths. 0 write-boundary violations in all five runs. |
| Input Tokens                              | 34                                                  |
| Cached Tokens                             | 1,041,361 read / 61,316 created                     |
| Output Tokens                             | 21,673                                              |
| Total Tokens or Credits Used              | 83,023 (excl. cache reads)                          |
| Estimated Cost                            | $1.68                                               |
| Elapsed Time                              | 4 min                                               |
| Number of Human Interventions / Redirects | 0                                                   |
| Reviewer Notes                            | (leave blank for now)                               |
| Final Rubric Score                        | (leave blank for now)                               |
| Recommendation                            | Candidate for Pilot                                 |

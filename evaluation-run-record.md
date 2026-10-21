# Evaluation Run Record — Iteration 7, Task Set B

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Codex harness; human operator not identified in session log |
| Reviewer |  |
| Harness | Codex with repository `AGENTS.md`, run workflow, and Cellix architecture skill |
| Model | `gpt-6-sol` |
| License / Plan | ChatGPT Business (`self_serve_business_prolite`) |
| Codebase | ECFMG/axc |
| Task Set | B, including Task Set A course search |
| Run Type | Harness Engineering Iteration 7 |
| Harness Engineering Used | Cellix architecture guidance and tests, focused layer tests, host acceptance, `pnpm run verify` |
| Config / Diff Notes | Feature commit changes 61 files across allowed API, docs, verification, domain, application-service, persistence, REST, and generated lockfile paths. No fixed task prompt, vendored Cellix, auth, production, or deployment edits. Uncommitted root hook/workspace/lockfile edits in the evaluation worktree are separate from this feature commit. |
| Branch / Commit | `dn-oai-7-b-out` / `17bd5fe847c03f60e7d0ca279b70e5409eeae579` |
| Requirements Completed / Attempted | 27/28 fully complete; B16 docs partial due to rendered formatting defect; 28 attempted |
| Acceptance Criteria Passed / Total | 25/27; A-AC11 lacks a second filter-combination test, B-AC15 has malformed rendered documentation |
| Tests Passed / Failed | Original run: 17/17 focused, 6/6 HTTP scenarios, 29/29 Turbo test tasks, 32/32 architecture tests. Independent review reran 17/17 focused tests. Retrospective rendered-docs review failed; the original run did not include that check. |
| Static Analysis / Security Findings | Biome, typecheck, build, Knip, dependency analysis, and audit completed. `pnpm run verify` failed at Snyk: 5 open findings (3 high `qs@6.16.0`, 2 moderate `hono@4.13.10`) across 23 projects. Both versions existed in the starting lockfile. Audit reported 2 moderate and 1 policy-ignored high. |
| Input Tokens | 22,412,226 |
| Cached Tokens | 22,220,032; uncached input 192,194 |
| Output Tokens | 51,163, including 11,425 reasoning tokens |
| Total Tokens or Credits Used | 22,463,389 tokens; credits unavailable |
| Estimated Cost | Unavailable |
| Elapsed Time | 23m 56s active. Supplied 101h 25m 20s wall elapsed includes an Oct 21 settings event; feature task ran about 32m 28s on Oct 17. |
| Number of Human Interventions / Redirects | 0 after initial task in available session log |
| Reviewer Notes | Commit `17bd5fe` has strong Cellix alignment and passing focused, architecture, and HTTP tests. A-AC11 remains unproven because only one combined course-filter query is tested; B16/B-AC15 are incomplete because a malformed fence hides the retrieval and status-change sections in the rendered enrollment docs. The original full gate failed at Snyk on dependency versions present before the feature commit. Remediate the documentation and test evidence, then rerun verification. This assessment excludes later uncommitted fixes. |
| Final Rubric Score | 83 / 100 |
| Recommendation | Remediate |

Category scoring and evidence are in `evaluation-run-record-scoring-details.md`. Reviewer identity remains blank pending sign-off.

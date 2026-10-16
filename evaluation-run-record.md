# Evaluation Run Record — Task Set B Baseline

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Duy Nguyen |
| Reviewer | Codex |
| Harness | Codex local session |
| Model | `gpt-6-sol` |
| License / Plan | ChatGPT Business (`self_serve_business_prolite`) |
| Codebase | ECFMG/axc |
| Task Set | B (`TS-B-COURSE-ENROLLMENT-WORKFLOW`, including Task Set A behavior) |
| Run Type | Baseline |
| Harness Engineering Used | No run-specific engineering demonstrated; repository guidance and existing tools were available |
| Config / Diff Notes | Feature code, tests, and docs in the allowed application paths. The later committed artifact also contains a `pnpm-lock.yaml` change outside the task write boundary; the session log says the agent did not make that edit. |
| Branch / Commit | `dn-oai-0-b-out` / `ef71b54e13a30651467cb6a98f514493713b5405` (operator-created commit after the session) |
| Requirements Completed / Attempted | 28/28 attempted; 25 substantively implemented or documented, with test coverage and existing-suite pass unproven for A10, B15, and B17 |
| Acceptance Criteria Passed / Total | No formal feature acceptance run. 23/27 appear supported by implementation and limited checks; A-AC10, A-AC11, B-AC13, and B-AC14 remain unproven. |
| Tests Passed / Failed | Original run: local TypeScript and manual service smoke passed; package test/lint/build could not start. Reviewer rerun: application services 32/32 tests, typecheck 23/23 tasks, build 18/18 tasks; full `pnpm run test` stopped at a Mongo port-bind `EPERM` in the sandbox. |
| Static Analysis / Security Findings | Feature-scope Biome check passed with one informational lint suggestion. No feature-attributable security finding observed. No security scan or secret scan was performed for this baseline review. |
| Input Tokens | 1,608,367 |
| Cached Tokens | 1,551,232 input tokens (96.4% of input) |
| Output Tokens | 17,274, including 4,489 reasoning tokens |
| Total Tokens or Credits Used | 1,625,641 tokens; credits unavailable |
| Estimated Cost | Unavailable from local session log |
| Elapsed Time | 4m 38s active and wall |
| Number of Human Interventions / Redirects | 0 redirects in the recorded task session; operator prepared the later commit |
| Reviewer Notes |  |
| Final Rubric Score | 67 / 100 |
| Recommendation | Remediate |

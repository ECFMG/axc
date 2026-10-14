# Evaluation Run Record

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Codex; local account dfortun |
| Reviewer |  |
| Harness | Codex Desktop, direct implementation; openai-harness-v7.12.01 frozen independent validation checks |
| Model | gpt-6.1-sol (primary and reviewer) |
| License / Plan | Not recorded for this run |
| Codebase | ECFMG/axc, pre-Task-A fe47c38 baseline |
| Task Set | A — TS-A-CATALOG-SEARCH |
| Run Type | Baseline feature implementation |
| Harness Engineering Used | Ponytail, Caveman, Cavecrew reviewer, and scoped Code Simplification; supplied harness adapter/model loop not executed |
| Config / Diff Notes | 11 allowed-path implementation files; no new dependencies, vendor edits, authentication changes, or tracked environment/production configuration changes |
| Branch / Commit | df-oai-2-out / implementation commit 2aa3cd4a60269dfd2081b4243ecfc00e63c8909d; df-oai-2 also points to that implementation commit |
| Requirements Completed / Attempted | A1–A11 / A1–A11 |
| Acceptance Criteria Passed / Total | 12 / 12; independent endpoint checks, submitted-test execution, and documentation inspection |
| Tests Passed / Failed | 46 new course tests; full suite 590 unit/integration cases and 1 health acceptance scenario; architecture 19; independent Hono 29 and Azure HTTP 29; final failures 0. Independent and submitted-test reruns overlap coverage and are not a unique-test total. |
| Static Analysis / Security Findings | Lint, typecheck, and architecture pass; reviewer test-cache finding corrected; no dedicated security scan performed |
| Input Tokens | 3,229,179 combined; primary 2,671,497; reviewer 557,682 |
| Cached Tokens | 3,067,776 combined; primary 2,576,256; reviewer 491,520; included in input |
| Output Tokens | 24,131 combined; primary 22,139; reviewer 1,992. Includes 4,721 reasoning output (primary 4,516; reviewer 205). |
| Total Tokens or Credits Used | 3,253,310 tokens; primary 2,693,636; reviewer 559,674. See [usage.json](usage.json); both original final responses included, all later follow-up turns excluded. |
| Estimated Cost | $0.870894 combined (primary $0.669498; reviewer $0.201396), using supplied Standard-mode rates. See [cost-estimate.json](cost-estimate.json). Actual billed charge unavailable; original 45,000-token [projection](projection.json) remains separate. |
| Elapsed Time | 667.733 seconds (11m 7.733s); original task 2026-10-14T20:23:36.211Z to 2026-10-14T20:34:43.944Z. Publication follow-ups excluded. |
| Number of Human Interventions / Redirects | 0 redirects after initial request during implementation; localhost execution permitted by automatic approval review |
| Reviewer Notes |  |
| Final Rubric Score |  |
| Recommendation | Candidate for Pilot, subject to human review; no rubric score assigned |

## Reference and evidence

This record uses the format of the [df-oai-0-out evaluation record](https://github.com/ECFMG/axc/blob/df-oai-0-out/apps/docs/evaluation-runs/task-a-2026-10-14-01a13c21/evaluation-run-record.md). That record describes a separate run; its measurements, cost, and score are not reused here.

- [Completion notes](completion-notes.md)
- [Validation results](validation-results.json)
- [Actual usage](usage.json) and [separate projection](projection.json)
- [Source and write-boundary provenance](provenance.json)

Original Task A token accounting is complete. No required token counters remain unmeasured. The primary counter timestamp is `2026-10-14T20:34:43.940Z`; reviewer counter timestamp is `2026-10-14T20:29:25.055Z`. Cached input is included in input; reasoning output is included in output.

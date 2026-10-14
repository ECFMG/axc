# Evaluation Run Record

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Codex; local account dfortun |
| Reviewer | |
| Harness | Codex Desktop, direct implementation; Lean Build skill |
| Model | gpt-6.1-sol; medium reasoning (original turn context) |
| License / Plan | Business Pro Lite (user supplied) |
| Codebase | ECFMG/axc, pre-Task-A fe47c38 baseline |
| Task Set | A — TS-A-CATALOG-SEARCH |
| Run Type | Baseline direct implementation |
| Harness Engineering Used | None |
| Config / Diff Notes | 9 allowed-path files; no new dependencies, vendor edits, or tracked environment/config changes |
| Branch / Commit | task-a-catalog-search / 7c0c875 |
| Requirements Completed / Attempted | A1–A11 / A1–A11 |
| Acceptance Criteria Passed / Total | 12 / 12, based on tests and documentation inspection |
| Tests Passed / Failed | 47 new endpoint tests; full suite 591 reported assertions and 1 acceptance scenario; final failures 0; architecture 19 passed |
| Static Analysis / Security Findings | Lint, typecheck, architecture pass; no dedicated security scan performed |
| Input Tokens | 2,286,707 |
| Cached Tokens | 2,155,520; included in input |
| Output Tokens | 17,112, including 2,571 reasoning output |
| Total Tokens or Credits Used | See usage.json; 2,303,819 tokens, original final response included; follow-up excluded |
| Estimated Cost | $0.649046 using supplied rates; actual billed charge unavailable; projected token estimate 500,000 remains separate |
| Elapsed Time | See usage.json start/end timestamps; original turn completed 2026-10-14T20:42:52.081Z |
| Number of Human Interventions / Redirects | 0 after initial request |
| Reviewer Notes | |
| Final Rubric Score | 80/100 (24/30), equal-weight agent self-assessment; see rubric-assessment.md |
| Recommendation | Candidate for Pilot |

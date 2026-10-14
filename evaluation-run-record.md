# Evaluation Run Record

This record describes the Task A run from session `01a13c21-5e20-7fe0-a4ae-5d958c1dee69`. All original-task token counters include its final response; follow-up publishing and scoring usage is excluded. The previous record described a different run and is [preserved here](evidence/task-a-2026-10-14-01a13c21/previous-evaluation-run-record.md).

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Dane Fortun; implementation by Codex |
| Reviewer | |
| Harness | Codex Desktop, direct implementation; Lean Build skill |
| Model | gpt-6.1-sol; medium reasoning (original turn context) |
| License / Plan | Business Pro Lite (user supplied) |
| Codebase | ECFMG/axc, pre-Task-A fe47c38 baseline |
| Task Set | A — TS-A-CATALOG-SEARCH |
| Run Type | Baseline direct implementation |
| Harness Engineering Used | None |
| Config / Diff Notes | 9 allowed-path files; no new dependencies, vendor edits, or tracked environment/config changes |
| Branch / Commit | Implementation: `df-oai-0-out` / `c87497b` (original local commit `7c0c875`); assessment commit `457bbdd`. This record is published on `df-oai-0-a-out`; application code on this branch was not replaced. |
| Requirements Completed / Attempted | A1–A11 / A1–A11 |
| Acceptance Criteria Passed / Total | 12 / 12, based on tests and documentation inspection |
| Tests Passed / Failed | 47 new endpoint tests; full suite 591 reported assertions and 1 acceptance scenario; final failures 0; architecture 19 passed |
| Static Analysis / Security Findings | Lint, typecheck, architecture pass; no dedicated security scan performed |
| Input Tokens | 2,286,707 |
| Cached Tokens | 2,155,520; included in input |
| Output Tokens | 17,112, including 2,571 reasoning output |
| Total Tokens or Credits Used | [usage.json](evidence/task-a-2026-10-14-01a13c21/usage.json); 2,303,819 tokens, original final response included; follow-up excluded |
| Estimated Cost | $0.649046 using supplied rates; actual billed charge unavailable; projected token estimate 500,000 remains separate |
| Elapsed Time | 378.875 seconds (6 minutes 18.875 seconds), 2026-10-14T20:36:33.206Z through 2026-10-14T20:42:52.081Z |
| Number of Human Interventions / Redirects | 0 after initial request |
| Reviewer Notes | |
| Final Rubric Score | 80/100 (24/30), equal-weight agent self-assessment; see [rubric assessment](evidence/task-a-2026-10-14-01a13c21/rubric-assessment.md) |
| Recommendation | Candidate for Pilot |

## Supporting results

- [Detailed score and cost calculation](evidence/task-a-2026-10-14-01a13c21/rubric-assessment.md)
- [Finalized measured usage](evidence/task-a-2026-10-14-01a13c21/usage.json)
- [Separate projected token estimate](evidence/task-a-2026-10-14-01a13c21/projected-estimate.json)
- [Separate rate-based cost estimate](evidence/task-a-2026-10-14-01a13c21/cost-estimate.json)
- [Completion notes, provenance, requirements, and validation](evidence/task-a-2026-10-14-01a13c21/completion-notes.md)
- [Full test suite output](evidence/task-a-2026-10-14-01a13c21/tests-unrestricted.log)
- [Endpoint tests](evidence/task-a-2026-10-14-01a13c21/endpoint-tests.log)
- [Architecture checks](evidence/task-a-2026-10-14-01a13c21/architecture.log)
- [Lint](evidence/task-a-2026-10-14-01a13c21/lint.log)
- [Typecheck](evidence/task-a-2026-10-14-01a13c21/typecheck.log)
- [Build](evidence/task-a-2026-10-14-01a13c21/build.log)
- [Documentation build](evidence/task-a-2026-10-14-01a13c21/docs-build.log)
- [Live Azure course smoke result](evidence/task-a-2026-10-14-01a13c21/host-smoke-result.log)
- [Completed source archive](evidence/task-a-2026-10-14-01a13c21/task-a-source.zip)
- [Implementation diff](evidence/task-a-2026-10-14-01a13c21/task-a.patch)
- [Git bundle](evidence/task-a-2026-10-14-01a13c21/task-a.bundle)
- [Baseline source archive](evidence/task-a-2026-10-14-01a13c21/baseline-source.zip)

Validation applies to the original `fe47c38` implementation baseline. Publication on `df-oai-0-out` preserves that branch's newer dependency fixes, but no full-suite rerun against those newer dependencies is claimed. The fresh-session zero usage baseline is inferred; there was no explicit pre-task token-count event. All five requested final token counters are available. Actual subscription charges and credits remain unmeasured. The $0.649046 cost is a calculated estimate using user-supplied rates.

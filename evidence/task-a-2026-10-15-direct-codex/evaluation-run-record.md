# Evaluation Run Record

This record covers the October 15, 2026 Task A implementation and its publication to `df-oai-3-out`. Original-task usage is complete, including the final assistant response. Publication checks and later conversations are excluded from that measurement.

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Dane Fortun; implementation by Codex |
| Reviewer |  |
| Harness | Codex Desktop direct implementation; supplied openai-harness-v7.12.02 archive inspected; independent course and submitted-test validators executed |
| Model | `gpt-6.1-sol`, medium reasoning (original turn context) |
| License / Plan | Not independently recorded for this run; no subscription-billing claim |
| Codebase | ECFMG/axc; original Task A base `fe47c38`; publication base `9c890d7` |
| Task Set | A — TS-A-CATALOG-SEARCH |
| Run Type | Baseline feature implementation, followed by evidence publication |
| Harness Engineering Used | Ponytail, Caveman, Cavecrew read-only reviewer and scoped Code Simplification. Supplied harness adapter/model generation loop was not executed. No Ollama calls or harness-efficiency savings claim. |
| Config / Diff Notes | 11 allowed-path implementation files, 12 local fixtures, 61 new application-service test cases and 6 new API integration cases. No new dependencies or implementation changes to authentication, protected settings, pipelines or Cellix source. Evidence publication adds the root record and evidence directories. |
| Branch / Commit | `df-oai-3-out`; implementation commit `671f8a551d69014ba842523a9868a95020b6a2a0`. Evidence follows in a separate commit. `df-oai-3` remains at the clean publication base. |
| Requirements Completed / Attempted | All 12 prompt requirements; A1–A11, complete eight-field Course contract and 12 mixed fixtures. |
| Acceptance Criteria Passed / Total | 12 / 12 (A-AC1–A-AC12); independent oracle 29/29 in Hono mode and 29/29 on real local Azure Functions host. |
| Tests Passed / Failed | Final original suite: 605 Vitest runtime/type cases, 6 Node API cases, one existing health acceptance scenario; architecture 19; 67 new tests. Publication reran all eight required commands successfully on the newer baseline; full test run had 26 successful Turbo tasks, zero cached tasks. Oracle/submitted reruns overlap other coverage and are not a unique-test total. Final failures: 0. |
| Static Analysis / Security Findings | Lint, build, typecheck, architecture, explicit changed-source format check and patch/write-boundary checks passed. Cavecrew review: no findings. No dedicated security scan was run. |
| Input Tokens | 2,954,305 aggregate; primary 2,504,708; code reviewer 371,965; automatic approval reviews 77,632. Cached input is included. |
| Cached Tokens | 2,798,720 aggregate; primary 2,415,872; code reviewer 330,368; automatic approval reviews 52,480. Subset of input. |
| Output Tokens | 21,059 aggregate; primary 19,505; code reviewer 1,174; automatic approval reviews 380. Reasoning output is included. |
| Reasoning Output Tokens | 3,554 aggregate; primary 3,276; code reviewer 87; automatic approval reviews 191. Subset of output. |
| Total Tokens or Credits Used | **2,975,364 recorded tokens**; primary 2,524,213; code reviewer 373,139; automatic approval reviews 78,012. Original final responses included; all later turns excluded. Credits unmeasured. |
| Projected Token Estimate | Approximately 3 million initially; exact assumption arithmetic 3,018,000 = 40 calls × 75,000 input + 18,000 output. Recorded during initial inspection, before source extraction or implementation. Separate from measured usage. |
| Estimated Cost | No run-specific billed-dollar counters or current-run pricing supplied; dollar estimate not calculated. Reference-run prices and costs are not reused. |
| Elapsed Time | 483.184 seconds (8m 3.184s): 2026-10-15T15:03:52.176Z to 2026-10-15T15:11:55.360Z. Publication follow-ups excluded. |
| Number of Human Interventions / Redirects | 0 after the edited original-task boundary. Three automatic permission reviews allowed locked dependency restore and localhost validation. Superseded original turn and later publication requests excluded. |
| Reviewer Notes |  |
| Final Rubric Score | Not scored; independent human assessment pending |
| Recommendation | Candidate for Pilot for this non-production sample, subject to independent human review |

## Implementation and validation

`GET /api/courses` supports case-insensitive keyword and tag search, modality/status filters, combined filters, pagination and ascending title/date sorts. Invalid raw query values return the required HTTP 400 envelope. The sample catalog is stateless and needs no external service. Health behavior and authorization-header forwarding remain covered.

The [completion report](report.txt) and [original validation results](validation-results.json) preserve original outcomes, including initial failures. An adapter-test response-stream assumption was corrected; localhost permission failures were resolved through approved execution. No implementation or validation blockers remain. Existing Node/Serenity deprecation warnings remain.

Publication applies the exact original 11-file patch to the newer AXC baseline; all implementation file bytes match the validated original deliverable. Separate publication checks rerun tests, lint, build, typecheck, architecture, both independent oracles and submitted-test/documentation gates.

- [Original validation logs](validation/)
- [Complete actual usage](usage.json) and [raw token snapshots](usage-snapshots.json)
- [Separate projection](projection.json) and [cost availability](cost-estimate.json)
- [Original source and write-boundary provenance](provenance.json)
- [Original source ZIP](task-a-source.zip) and [patch](task-a.patch)

## Token accounting

Original session: `01a14015-47d3-7ae1-a349-2262998a9c5b`. Original edited turn: `01a14017-5066-7693-a4c9-36f789890dcc`. Primary ending counter timestamp: `2026-10-15T15:11:55.356Z`. Source log paths, agent turn IDs, timestamps, cumulative boundaries and individual deltas appear in `usage.json`.

The primary and code-review logs start with fresh counter origins; no explicit preceding cumulative snapshot exists. Zero baselines are inferred from those origins. Usage is ending cumulative minus starting cumulative, never a sum of snapshots. Disjoint primary, reviewer and automatic-review deltas are added once. Cached input is included in input; reasoning output is included in output. All five requested token counters and original final responses are accounted for. Superseded preparation and later follow-up turns are excluded. Billed dollars and credits are unmeasured.

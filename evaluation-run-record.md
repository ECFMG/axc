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
| Estimated Cost | **USD $0.801632 (~$0.80) API-equivalent estimate** using the supplied screenshot rates. Confirmed gpt-6.1-sol portion: $0.742280; automatic-review portion: $0.059352 assuming the same rates for codex-auto-review. Actual billed charges unavailable. See [calculation](evidence/task-a-2026-10-15-direct-codex/cost-estimate.json). |
| Elapsed Time | 483.184 seconds (8m 3.184s): 2026-10-15T15:03:52.176Z to 2026-10-15T15:11:55.360Z. Publication follow-ups excluded. |
| Number of Human Interventions / Redirects | 0 after the edited original-task boundary. Three automatic permission reviews allowed locked dependency restore and localhost validation. Superseded original turn and later publication requests excluded. |
| Reviewer Notes |  |
| Final Rubric Score | **90/100 (27/30)** — Codex assessment across six equally weighted categories; independent human review pending. See [assessment](evidence/task-a-2026-10-15-direct-codex/rubric-assessment.json). |
| Recommendation | Candidate for Pilot for this non-production sample, subject to independent human review |

## Implementation and validation

`GET /api/courses` supports case-insensitive keyword and tag search, modality/status filters, combined filters, pagination and ascending title/date sorts. Invalid raw query values return the required HTTP 400 envelope. The sample catalog is stateless and needs no external service. Health behavior and authorization-header forwarding remain covered.

The [completion report](evidence/task-a-2026-10-15-direct-codex/report.txt) and [original validation results](evidence/task-a-2026-10-15-direct-codex/validation-results.json) preserve original outcomes, including initial failures. An adapter-test response-stream assumption was corrected; localhost permission failures were resolved through approved execution. No implementation or validation blockers remain. Existing Node/Serenity deprecation warnings remain.

Publication applies the exact original 11-file patch to the newer AXC baseline; all implementation file bytes match the validated original deliverable. Separate publication checks rerun tests, lint, build, typecheck, architecture, both independent oracles and submitted-test/documentation gates.

- [Original validation logs](evidence/task-a-2026-10-15-direct-codex/validation/)
- [Complete actual usage](evidence/task-a-2026-10-15-direct-codex/usage.json) and [raw token snapshots](evidence/task-a-2026-10-15-direct-codex/usage-snapshots.json)
- [Separate projection](evidence/task-a-2026-10-15-direct-codex/projection.json) and [cost estimate](evidence/task-a-2026-10-15-direct-codex/cost-estimate.json)
- [Original source and write-boundary provenance](evidence/task-a-2026-10-15-direct-codex/provenance.json)
- [Original source ZIP](evidence/task-a-2026-10-15-direct-codex/task-a-source.zip) and [patch](evidence/task-a-2026-10-15-direct-codex/task-a.patch)

## Token accounting

Original session: `01a14015-47d3-7ae1-a349-2262998a9c5b`. Original edited turn: `01a14017-5066-7693-a4c9-36f789890dcc`. Primary ending counter timestamp: `2026-10-15T15:11:55.356Z`. Source log paths, agent turn IDs, timestamps, cumulative boundaries and individual deltas appear in `usage.json`.

The primary and code-review logs start with fresh counter origins; no explicit preceding cumulative snapshot exists. Zero baselines are inferred from those origins. Usage is ending cumulative minus starting cumulative, never a sum of snapshots. Disjoint primary, reviewer and automatic-review deltas are added once. Cached input is included in input; reasoning output is included in output. All five requested token counters and original final responses are accounted for. Superseded preparation and later follow-up turns are excluded. Billed dollars and credits are unmeasured.

## Publication evidence

- [New-baseline validation](evidence/publication-2026-10-15-df-oai-3-out/validation-results.json)
- [Publication provenance](evidence/publication-2026-10-15-df-oai-3-out/provenance.json)
- [Frozen harness archive and source](evidence/harness-v7.12.02/)

The evidence layout follows [df-oai-1-a-out](https://github.com/ECFMG/axc/tree/df-oai-1-a-out); the field structure follows [df-oai-2-out](https://github.com/ECFMG/axc/blob/df-oai-2-out/evaluation-run-record.md). Their test counts, usage, costs and scores describe other runs and are not reused.

## Final rubric assessment

Six Task A categories use the reference records' 1–5 scale with equal weights because no numeric weights were supplied: **27 / 30 × 100 = 90/100**. This is Codex's evidence-based assessment; independent human review remains pending.

| Category | Score | Basis |
| --- | --- | --- |
| Functional correctness | 5/5 | All twelve acceptance criteria pass; both independent endpoint oracles pass 29/29 checks. |
| Tests and validation | 5/5 | Full suite, 67 new tests, lint, build, typecheck, 19 architecture checks and submitted-test gates pass. Publication full suite reruns with zero cached tasks. |
| Architecture and codebase alignment | 4/5 | Existing application-service injection, Hono routing and Azure composition root are preserved. Read-only review reports no findings. Evidence covers a small fixture-backed sample, not broader domain or production architecture. |
| Security and guardrail compliance | 5/5 | Implementation respects allowed paths and preserves authentication, dependencies, protected settings and Cellix source. This scores task-boundary compliance; no dedicated security scan was run. |
| Context/token/cost efficiency | 3/5 | 2,975,364 recorded tokens remain below the 3,018,000 projection, but repeated input context dominates and no matched harness-efficiency comparison proves savings. |
| Developer workflow fit | 5/5 | Committed implementation, API documentation, patch, source archive, frozen harness, full logs, finalized usage and successful new-baseline checks are published with a clear root evaluation record. |

## Final cost estimate

The user-supplied [Standard-mode pricing screenshot](evidence/task-a-2026-10-15-direct-codex/pricing-source.png) lists $2.00 per million uncached input tokens, $0.10 cached input, $10.00 output, and $2.50 cache writes. Cached input is a subset of input; reasoning output is a subset of output. Cache-write counters are zero in all original-task agent logs. Maximum per-call input is 120,305 tokens, below the 272K long-context threshold, so no multiplier applies.

| Component | Input tokens | Cached input | Output tokens | Estimated USD |
| --- | ---: | ---: | ---: | ---: |
| Primary gpt-6.1-sol | 2,504,708 | 2,415,872 | 19,505 | $0.6143092 |
| Code reviewer gpt-6.1-sol | 371,965 | 330,368 | 1,174 | $0.1279708 |
| Confirmed-model subtotal | 2,876,673 | 2,746,240 | 20,679 | **$0.7422800** |
| Automatic reviews, assuming the same rates | 77,632 | 52,480 | 380 | $0.0593520 |
| All-agent estimate with that assumption | 2,954,305 | 2,798,720 | 21,059 | **$0.8016320** |

All-agent arithmetic: `((2,954,305 − 2,798,720) × $2.00 + 2,798,720 × $0.10 + 21,059 × $10.00 + 0 × $2.50) / 1,000,000 = $0.801632`.

Automatic reviews identify their model as `codex-auto-review`; its actual price is unavailable. The $0.801632 total therefore assumes the supplied gpt-6.1-sol rates also apply to those reviews. The model-confirmed $0.742280 portion is priced directly from the supplied rates. Both are API-equivalent estimates, not measured subscription billing. Original final responses are included; all follow-up and publication work is excluded.

## Harness efficiency follow-up

[Harness v7.12.03](evidence/harness-v7.12.03/) implements the subsequent efficiency recommendations: fresh-context review handoff, native focused repair, stronger preflight, deterministic efficiency reporting and host guidance. All 224 tests pass, including 23 new tests; fresh-context code review found no issues. The original Task A measurement, cost estimate and rubric above remain unchanged. No matched live-model trial or measured savings claim accompanies this release.

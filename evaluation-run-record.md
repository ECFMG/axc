# Evaluation Run Record — Task B, session 01a15b09

This record describes only the work in this chat. The supplied baseline already implemented Task A and Task B; this run inspected, strengthened and validated it. Earlier evaluation artifacts remain under `apps/docs/evaluation-task-b/` and are not used as this run's measurements.

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Codex; user authorized publication |
| Reviewer | |
| Harness | Codex Desktop |
| Model | gpt-6.1-sol, as recorded in the current turn log |
| License / Plan | Not independently verified for this evaluation |
| Codebase | ECFMG/axc |
| Task Set | B, including Task A regression coverage |
| Run Type | Final completion/validation of supplied implemented baseline |
| Harness Engineering Used | No custom harness or implementation subagents |
| Config / Diff Notes | Strengthened transition invariants; added direct rule/storage/error tests; updated API docs; five source files changed |
| Branch / Commit | df-oai-0-b-out; baseline cd44fba54579483058c1dbff52696a10b1745eff; publication commit is the commit containing this file |
| Requirements Completed / Attempted | A1–A11; B1–B17 |
| Acceptance Criteria Passed / Total | A: 12/12; B: 15/15, assessed by code review plus test evidence |
| Tests Passed / Failed | 666 unit/integration tests; 4 host acceptance scenarios; 19 architecture checks; 0 final failures |
| Static Analysis / Security Findings | Lint, typecheck and build pass; no dedicated security scan claimed |
| Input Tokens | 2,436,264 |
| Cached Tokens | 2,370,176, already included in input |
| Output Tokens | 12,768 |
| Reasoning Output Tokens | 1,966, already included in output |
| Cache Write Input Tokens | 0 |
| Total Tokens or Credits Used | 2,449,032 recorded primary tokens; credits unmeasured |
| Projected Token Estimate | 800,000–1,800,000; assumed full implementation, regression checks and several validation passes; estimate separate from actual |
| Estimated Cost | USD 0.4968736, about USD 0.50, at user-supplied rates; actual billing unmeasured |
| Elapsed Time | Approximately 6 minutes, 4:38:40–4:44:41 p.m. America/New_York on October 20, 2026 |
| Number of Human Interventions / Redirects | 1 original-task source clarification; this publication is a separate authorized follow-up |
| Reviewer Notes | |
| Final Rubric Score | 26/30 (86.7%); primary-assistant self-assessment, not independent review |
| Recommendation | Candidate for Pilot for sample workflow; improve domain separation and context efficiency |

Original primary-session accounting is complete, including its final response. Start cumulative counters at 2026-10-20T20:38:36.352Z; ending cumulative counters at 2026-10-20T20:44:41.120Z. Later conversations are excluded. Counters are subtracted, not summed. No implementation subagents were used. Automatic approval-review model usage, if incurred, is not exposed in the primary session log and is unmeasured; cost covers only measured primary usage.

Cost calculation: (66,088 uncached input × $2 + 2,370,176 cached input × $0.10 + 12,768 output × $10 + 0 cache-write × $2.50) / 1,000,000 = **$0.4968736**. Maximum recorded request input: 97,908, below the supplied 272K surcharge threshold.

## Final rubric

| Category | Score | Basis |
| --- | --- | --- |
| Functional correctness | 5/5 | Task A search and B1–B17 have implementation and test evidence, including active-course checks, duplicate prevention, all allowed and invalid transitions, filtering and audit history. |
| Tests and validation | 5/5 | 666 unit/integration tests, 4 live-host acceptance scenarios and 19 architecture checks pass; lint, typecheck and full API/docs build pass. Cache reuse and the initial sandbox failure are disclosed. |
| Architecture and codebase alignment | 4/5 | Existing Hono/factory composition preserved without dependencies or vendor edits. Lifecycle rules and concrete storage still reside in application-services rather than the existing domain/persistence packages. |
| Security and guardrail compliance | 5/5 | This run’s source delta stays within allowed paths; validation, immutable storage returns and safe error envelopes are tested. Authentication, production configuration, secrets and vendored code are unchanged. No independent security audit is claimed. |
| Context/token/cost efficiency | 2/5 | 33 primary model requests consumed 2,449,032 tokens; repeated context and broad filesystem discovery added avoidable overhead. Most input was cached, reducing the rate-based cost. No matched baseline supports a comparative efficiency claim. |
| Developer workflow fit | 5/5 | Reviewable source archive and patch, endpoint docs, reproducible command logs, source hash/revision and final-response-inclusive accounting are provided. Scope and sample-only persistence limitations are explicit. |

## Evidence

- [Measured usage and boundaries](apps/docs/evaluation-task-b-01a15b09/usage.json)
- [Cost calculation](apps/docs/evaluation-task-b-01a15b09/cost-estimate.json)
- [Detailed rubric](apps/docs/evaluation-task-b-01a15b09/final-rubric.json)
- [Findings and limitations](apps/docs/evaluation-task-b-01a15b09/results.txt)
- [Final test log](apps/docs/evaluation-task-b-01a15b09/validation/test-final.log)
- [User-provided pricing image](apps/docs/evaluation-task-b-01a15b09/pricing-reference.png)
- [Courses API](apps/docs/docs/api/courses.md)
- [Enrollment API](apps/docs/docs/api/enrollment-requests.md)

Requests remain process-local and reset on restart; reviewer identifiers are caller-supplied under the sample's existing routing convention. No production-readiness claim is made.

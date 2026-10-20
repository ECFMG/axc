# Evaluation Run Record — Task B

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Not recorded |
| Reviewer | |
| Harness | Codex Desktop |
| Model | `gpt-6.1-sol`; automatic approval reviews used `codex-auto-review` |
| License / Plan | Not specified by operator |
| Codebase | ECFMG/axc |
| Task Set | B — Course Search and Enrollment Request Workflow; Task A seeded starting point |
| Run Type | Final direct implementation run |
| Harness Engineering Used | Existing repository conventions; no custom harness or implementation subagents. Two built-in approval reviews allowed local-socket validation. |
| Config / Diff Notes | Added enrollment creation, retrieval, filtering, transitions, audit history, duplicate prevention, tests and API docs. Preserved Task A search. Added package-local documentation build-cache inputs. No new dependencies or vendored source changes. |
| Branch / Commit | `df-oai-0-b-out`; implementation and evaluation commit [`ced0d4a`](https://github.com/ECFMG/axc/commit/ced0d4a030c46b5b890426526de326caf01d4db2); starting commit `d6153e2f09645297fc17749a438e7728d9754fe0` |
| Requirements Completed / Attempted | B1–B17: 17/17; Task A A1–A11 preserved |
| Acceptance Criteria Passed / Total | B: 15/15; A: 12/12, based on submitted test evidence |
| Tests Passed / Failed | 653 unit/integration tests, 4 host acceptance scenarios, 19 architecture checks; final failures: 0 |
| Static Analysis / Security Findings | Lint, type checking, architecture checks and build pass. No dedicated security scan or independent security audit claimed. |
| Input Tokens | Primary: 3,508,675; approval reviews: 44,271; combined: **3,552,946** |
| Cached Tokens | Primary: 3,407,744; approval reviews: 26,240; combined: **3,433,984** (already included in input tokens) |
| Output Tokens | Primary: 26,161; approval reviews: 253; combined: **26,414** |
| Reasoning Output Tokens | Primary: 6,146; approval reviews: 126; combined: **6,272** (already included in output tokens) |
| Total Tokens or Credits Used | Primary: **3,534,836**; approval reviews: **44,524**; combined: **3,579,360**. Credits not measured. |
| Projected Token Estimate | 350,000 total tokens; assumed 15–25 calls averaging about 14,000 input and 1,000–2,000 output tokens. Projection is separate from actual usage and underestimated repeated context. |
| Estimated Cost | Primary: **$0.8042464**. Approval reviews at the same assumed rates: **$0.041216**. Combined same-rate scenario: **$0.8454624 (about $0.85)**. Uses the operator-provided pricing image; approval-review pricing is unverified. Not a billing statement. |
| Elapsed Time | Original task: **9m25.974s**, October 20, 2026, 4:17:31.932–4:26:57.906 p.m. America/New_York (20:17:31.932–20:26:57.906 UTC). Follow-ups excluded. |
| Number of Human Interventions / Redirects | 1 during original task: operator specified the output branch after source clarification. Later costing, scoring and publication requests are follow-ups. |
| Reviewer Notes | |
| Final Rubric Score | **26/30 (86.7%)**, post hoc primary-assistant operational self-assessment; not an independent reviewer grade or controlled comparison. |
| Recommendation | Candidate for Pilot for the sample workflow; improve domain separation and context efficiency before broader use. |

## Final rubric

Six equally weighted categories, each scored from 0 to 5. These are explicitly declared operational judgments; no fixed scoring anchors were supplied for this run.

| Category | Score | Basis |
| --- | --- | --- |
| Functional correctness | 5/5 | Required course and enrollment behaviors have implementation and test evidence. |
| Tests and validation | 5/5 | Final test suite, live host acceptance, lint, build, type checking and architecture checks pass. |
| Architecture and codebase alignment | 4/5 | Existing composition and delivery boundaries preserved; enrollment lifecycle rules and concrete storage remain in application services instead of the domain/persistence packages. |
| Security and guardrail compliance | 5/5 | Input and state validation exercised; authorized source boundaries respected; no authentication, production configuration, secret, dependency or vendor-source changes. Dedicated security scanning not performed. |
| Context/token/cost efficiency | 2/5 | Forty-two primary model requests and repeated large contexts add overhead. Cache reuse reduces estimated cost; no matched Task B baseline establishes relative savings. Projection error is reported separately. |
| Developer workflow fit | 5/5 | Implementation, API documentation, validation evidence, complete original-task accounting, cost assumptions and limitations are available on the output branch. |
| **Total** | **26/30** | **86.7%; self-assessment** |

## Measurement and pricing

Original task accounting is **complete**, including its final assistant response. Counters use ending cumulative usage minus starting cumulative usage; cumulative snapshots are not summed. All later follow-up conversations, including cost estimation and publication, are excluded. No original-task token counters are missing.

The supplied rates are $2.00 per million uncached input tokens, $0.10 per million cached input tokens, $10.00 per million output tokens and $2.50 per million cache-write tokens. Cache writes recorded: zero. Maximum primary request input: 116,709 tokens, below the supplied 272,000-token surcharge threshold. Reasoning output is charged within output, never added again.

The primary estimate is `(100,931 × $2 + 3,407,744 × $0.10 + 26,161 × $10) / 1,000,000 = $0.8042464`. The approval-review cost is a separate same-rate scenario because the image only names the primary model.

## Evidence and limitations

- [Complete usage and measurement boundaries](apps/docs/evaluation-task-b/usage.json)
- [Cost calculation and assumptions](apps/docs/evaluation-task-b/cost-estimate.json)
- [Detailed final rubric](apps/docs/evaluation-task-b/final-rubric.json)
- [Implementation findings](apps/docs/evaluation-task-b/REPORT.txt)
- [Validation results](apps/docs/evaluation-task-b/validation/results.json)
- [Final test log](apps/docs/evaluation-task-b/validation/test.log)
- [Courses API documentation](apps/docs/docs/api/courses.md)
- [Enrollment API documentation](apps/docs/docs/api/enrollment-requests.md)
- [Operator-provided pricing image](apps/docs/evaluation-task-b/pricing-reference.png)

Enrollment state is process-local, resets on restart and has no cross-process uniqueness guarantee. `changedBy` is a caller-supplied operator identifier under the sample's existing anonymous routing convention. These results establish sample-workflow behavior, not production readiness.

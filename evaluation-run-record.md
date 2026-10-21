# Evaluation Run Record

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Dane Fortun (human operator); Codex implementation assistant |
| Reviewer | Cavecrew investigator and reviewer (automated); final rubric is assistant self-assessment, not independent human approval |
| Harness | Native Codex desktop; supplied OpenAI harness v7.12.02 inspected; unchanged independent course oracle used |
| Model | gpt-6.1-sol; medium reasoning, per session metadata |
| License / Plan | Not recorded for this evaluation |
| Codebase | ECFMG/axc |
| Task Set | B (course search included solely as the B1 prerequisite) |
| Run Type | Implementation run; not a controlled model/harness comparison |
| Harness Engineering Used | Ponytail, Caveman, Cavecrew investigator/reviewer, Code Simplification |
| Config / Diff Notes | 15 original implementation files within task boundaries; no dependencies/authentication/production settings/Cellix changes. Root evaluation record and supporting evidence added under subsequent explicit publication request. |
| Branch / Commit | df-oai-4-b-out; implementation baseline 9c890d75784ea7a18fe0c192cfacfdcdaa1ef111; implementation and evaluation evidence published together in the commit containing this record |
| Requirements Completed / Attempted | B1–B17, including B1 course-search prerequisite |
| Acceptance Criteria Passed / Total | B: 15/15 mapped; required course-search prerequisite validated; not independent rubric scoring |
| Tests Passed / Failed | Full suite 25/25 tasks; feature tests 110/110; host enrollment 64/64; independent courses 29/29 in memory and 29/29 via HTTP; architecture 9/9; no final failures |
| Static Analysis / Security Findings | Lint passed, 0 errors and 16 informational suggestions; typecheck/build/docs/architecture passed. No dedicated security scan performed. |
| Input Tokens | 7,056,935 recorded aggregate |
| Cached Tokens | 6,844,544; included in input |
| Output Tokens | 39,811; includes 10,464 reasoning output tokens |
| Total Tokens or Credits Used | 7,096,746; complete original Task B, including final response; follow-up excluded |
| Estimated Cost | $1.5073464 (approximately $1.51); estimate using operator-supplied rate card, not actual billing |
| Elapsed Time | 0:14:53.346000 (original task through task_complete) |
| Number of Human Interventions / Redirects | 1 source-branch clarification during work |
| Reviewer Notes | Resolved email-format validation and stale documentation findings. See linked review findings and validation evidence. |
| Final Rubric Score | 23/25 across five assessed categories; overall /30 UNASSIGNED because matched efficiency comparison is missing |
| Recommendation | Continue for sample evaluation; conduct matched comparison before efficiency scoring or savings claims |

Original Task B usage complete through **2026-10-21T13:08:07.997Z** (2026-10-21 09:08:07 EDT), including its final assistant response. This follow-up turn is excluded.

| Actor | Input | Cached input (included) | Output | Reasoning output (included) | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Main | 5,345,268 | 5,216,768 | 35,185 | 10,109 | 5,380,453 |
| Investigator + reviewer | 1,711,667 | 1,627,776 | 4,626 | 355 | 1,716,293 |
| Aggregate | 7,056,935 | 6,844,544 | 39,811 | 10,464 | 7,096,746 |

Projected estimate: 2,000,000 tokens. Assumptions: 25–40 calls, 45k–65k input per call, 10k–20k output overall. Estimate timing exception is disclosed in the completion report.

All requested original-task token counters are measured. Both subagent final responses and the original main final response are included. Follow-up usage is excluded. `usage.json` contains source logs, boundaries, and per-actor counters.

## Rubric assessment

This is a retrospective assistant self-assessment using the supplied six-category policy, not an independently awarded score. Dane Fortun is the human operator; no human review approval is inferred.

| Category | Score | Rationale |
| --- | --- | --- |
| Functional correctness | 5/5 | Required Task B behaviors and errors pass in feature and host checks. |
| Tests and validation | 4/5 | Required Task B gates pass; the archived eight-gate Task A controller protocol was not completed as a frozen protocol for this run. |
| Architecture and codebase alignment | 5/5 | Composition preserved, logical modules separated, architecture checks pass, review findings resolved. |
| Security and guardrail compliance | 5/5 | Original write boundaries respected; input and state rules exercised; protected sources unchanged. No dedicated security scan. |
| Context/token/cost efficiency | Unscored /5 | No predeclared matched comparison; absolute tokens, forecast error, and estimated price do not establish savings. |
| Developer workflow fit | 4/5 | Reproducible artifacts and complete original-task accounting; estimate timing and initial scope-label deviations disclosed. |

**Assessed subtotal: 23/25. Overall /30 score remains unassigned.** The supplied policy requires all six evidence-backed scores before assigning an overall total. This is an assessment evidence gap, not an implementation blocker.

## Estimated cost using operator-supplied rates

The attached rate card supplies $2.00 per million uncached input tokens, $0.10 per million cached input tokens, $2.50 per million cache-write tokens, and $10.00 per million output tokens. These are user-supplied assumptions, not verified official current pricing or recorded billing.

- Uncached input: 212,391 tokens × $2.00/M = $0.424782.
- Cached input: 6,844,544 tokens × $0.10/M = $0.6844544.
- Output: 39,811 tokens × $10.00/M = $0.39811.
- Cache writes: zero recorded tokens; $0.
- **Estimated total: $1.5073464 (approximately $1.51).**

Cached input is not charged again as uncached input; reasoning output is already included in output. Largest recorded per-call input was 144,568 tokens, below the supplied 272,000-token surcharge threshold. All cost and usage figures concern the original Task B turn and its two subagent turns. Clarification and publication follow-ups are excluded.

## Published findings and evidence

- [Completion report](apps/docs/static/evaluation/task-b/completion-report.md)
- [Review findings and resolutions](apps/docs/static/evaluation/task-b/review-findings.md)
- [Validation summary](apps/docs/static/evaluation/task-b/validation.json)
- [Final full-suite log](apps/docs/static/evaluation/task-b/test.log)
- [Enrollment Azure-host checks](apps/docs/static/evaluation/task-b/host-enrollment-tests.log)
- [Recorded original-task usage](apps/docs/static/evaluation/task-b/usage.json)
- [Cost calculation](apps/docs/static/evaluation/task-b/cost-estimate.json)
- [Supplied rate card](apps/docs/static/evaluation/task-b/rate-card.png)
- [Rubric policy](apps/docs/static/evaluation/task-b/rubric-policy.json)
- [Rubric assessment](apps/docs/static/evaluation/task-b/rubric-assessment.json)
- [Original implementation inventory and hashes](apps/docs/static/evaluation/task-b/deliverables.json)
- [Implementation patch](apps/docs/static/evaluation/task-b/changes.patch)

The evidence directory also retains baseline failures, lint/build/typecheck/architecture/docs logs, independent course-oracle results, patch verification, and original source ZIP. No raw Codex conversation/JSONL logs, secrets, environment files, dependencies, or generated deployment bundles are published. Source-log paths and turn IDs in usage.json identify local measurement provenance.

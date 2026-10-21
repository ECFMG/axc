# Evaluation Run Record

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Dane Fortun (human operator); Codex implementation assistant |
| Reviewer | |
| Harness | Native Codex Desktop 0.162.0-alpha.17.2; supplied OpenAI harness v7.12.02 inspected, not dispatched as a Task B controller |
| Model | gpt-6.1-sol; medium reasoning, per original session metadata |
| License / Plan | Not independently recorded for this evaluation |
| Codebase | ECFMG/axc |
| Task Set | B, including preservation of Task A course search |
| Run Type | Native implementation from an existing Task A seed; retrospective reference comparison, not a controlled matched trial |
| Harness Engineering Used | Ponytail, Caveman, Cavecrew read-only review, scoped Code Simplification |
| Config / Diff Notes | 21 original changed/new files inside permitted paths. Three existing workspace dependency links added; root lockfile unchanged. Target branch's newer root/security/dependency changes preserved during publication. |
| Branch / Commit | df-oai-5-b-out; implementation and evidence commit [4334e8e](https://github.com/ECFMG/axc/commit/4334e8e2d57de5fd0583ffd936c57919620aba7d); original seed d6153e2f09645297fc17749a438e7728d9754fe0; publication base 9c890d75784ea7a18fe0c192cfacfdcdaa1ef111 |
| Requirements Completed / Attempted | B1–B17 implemented; Task A search preserved; frozen-install remediation outstanding |
| Acceptance Criteria Passed / Total | 15/15 Task B criteria covered in original evaluated workspace; clean installation on published dependency baseline not validated |
| Tests Passed / Failed | Full suite 28/28 tasks; 118 direct API tests; service suite 16 reported runtime/type checks; four hosted scenarios; nine architecture checks; no final failures |
| Static Analysis / Security Findings | Lint, typecheck, build, architecture and fresh docs build pass. Reviewer email-validation finding fixed. No dedicated security scan. Publication lint/docs build pass; full exact publication dependency combination remains unvalidated. |
| Input Tokens | 5,284,190 |
| Cached Tokens | 5,076,608; already included in input |
| Output Tokens | 33,025; includes 7,223 reasoning output tokens |
| Total Tokens or Credits Used | 5,317,215 recorded native tokens; complete original task, including final response and reviewer; follow-ups excluded |
| Estimated Cost | $1.2530748 USD (approximately $1.25), API-equivalent estimate using supplied Standard rates; actual billing unmeasured |
| Elapsed Time | 16m 7.589s; original task 2026-10-21T13:25:11.108Z to 2026-10-21T13:41:18.697Z |
| Number of Human Interventions / Redirects | 0 substantive redirects during original implementation; later publication/comparison requests excluded |
| Reviewer Notes | |
| Final Rubric Score | 22/25 across five assessed categories; efficiency unscored and overall /30 unassigned. Post-run assistant assessment, not independent human approval. |
| Recommendation | Remediate root lockfile, validate exact publication dependencies, and run an equivalent matched comparison before assigning an overall efficiency score |

## Recorded original-task usage

| Actor | Input | Cached input (included) | Output | Reasoning output (included) | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Primary | 4,848,777 | 4,695,680 | 31,322 | 7,040 | 4,880,099 |
| Cavecrew reviewer | 435,413 | 380,928 | 1,703 | 183 | 437,116 |
| Aggregate | 5,284,190 | 5,076,608 | 33,025 | 7,223 | 5,317,215 |

Original final-response counters are included. All publication, reporting and comparison follow-up turns are excluded. Task usage is ending cumulative counters minus starting counters for each actor; cumulative snapshots are not summed. Neither actor had an explicit pre-task snapshot. Zero starting counters were reconstructed from the fresh session's first total/last counters, retaining the first call's usage. Native primary and explicit reviewer accounting is complete. Automatic tool-side approval-review model counters, if incurred, are unexposed and unmeasured.

Initial projection: **500,000–2,000,000 total tokens**, including repeated cached input, inspection, implementation, validation, review and reporting. It was recorded at 2026-10-21T13:25:46.630004Z after initial document/archive inspection and before implementation; this missed the requested pre-inspection estimate timing. Measured usage exceeded the unchanged projection. Estimates never replace recorded counters.

## Estimated cost

| Component | Tokens | Supplied USD / million | Estimated USD |
| --- | ---: | ---: | ---: |
| Uncached input | 207,582 | 2.00 | 0.415164 |
| Cached input | 5,076,608 | 0.10 | 0.5076608 |
| Cache writes | 0 | 2.50 | 0 |
| Output, including reasoning | 33,025 | 10.00 | 0.33025 |
| Total | | | **1.2530748** |

Primary estimate: $1.088982; reviewer estimate: $0.1640928. These are Standard-mode API-equivalent estimates from the supplied rate card, not measured Codex charges. Rates were corroborated against [official OpenAI model documentation](https://developers.openai.com/api/docs/models/gpt-6.1-sol). Largest original prompt: 145,120 input tokens, below 272,000; no long-context multiplier applies. Cached input and reasoning output are not charged twice.

## Rubric assessment

This is a retrospective assistant assessment using the supplied six-category policy, not an independently awarded human score.

| Category | Score | Rationale |
| --- | --- | --- |
| Functional correctness | 5/5 | Task B criteria and course regression covered by passing feature and hosted checks. |
| Tests and validation | 4/5 | Required Task B checks pass; frozen installation remains unresolved and the archived eight-gate Task A protocol is not claimed as a completed Task B trial. |
| Architecture and codebase alignment | 4/5 | Existing packages and composition used; review finding fixed. Workspace lockfile synchronization remains unresolved. |
| Security and guardrail compliance | 5/5 | Permitted source boundaries respected; protected settings/authentication/Cellix unchanged; existing workspace links only. No dedicated security scan. |
| Context/token/cost efficiency | Unscored /5 | Reference comparison below shows lower observed totals, but seeds, validation, actor counts and experimental conditions differ. |
| Developer workflow fit | 4/5 | Complete original-task evidence and final-response usage; exact publication dependency combination and clean frozen install remain unvalidated. |

**Assessed subtotal: 22/25. Overall /30 remains unassigned.** Under the supplied policy, all six evidence-backed category scores are needed for an overall score.

## Operator-designated comparison: df-oai-4-b-out

The operator supplied [df-oai-4-b-out](https://github.com/ECFMG/axc/blob/df-oai-4-b-out/evaluation-run-record.md) as the efficiency reference. Read at commit `a4da58d9ffbd3d8d276d89fa8f51dcf78d875820`; its record, usage and validation snapshots are retained alongside this run.

| Measure | df-oai-4-b-out | df-oai-5-b-out |
| --- | ---: | ---: |
| Recorded input tokens | 7,056,935 | 5,284,190 |
| Cached input, included | 6,844,544 | 5,076,608 |
| Output tokens | 39,811 | 33,025 |
| Reasoning output, included | 10,464 | 7,223 |
| Total recorded native tokens | 7,096,746 | 5,317,215 |
| Estimated cost at supplied rates | $1.5073464 | $1.2530748 |
| Explicit subagent turns | 2 | 1 |
| Original implementation seed | Neither feature present; Task A sources reused/adapted | Task A already implemented |
| Frozen dependency installation | Passed | Not validated; lockfile links unresolved |
| Enrollment host validation | 64 checks, including 62 HTTP checks | One complete workflow scenario within four hosted scenarios |
| Independent course oracle | 29 checks in memory and 29 via HTTP | Not run; existing course regression tests preserved |

Run 5 records **1,779,531 fewer tokens (25.08%)** and **$0.2542716 lower estimated cost (16.87%)**. Both report gpt-6.1-sol with medium reasoning; both include original final responses and explicit subagents and exclude follow-up usage. These are observed totals, not an isolated harness/model efficiency effect or proof of equal quality.

This is not a controlled matched experiment: starting sources differ, validation procedures differ, actor counts differ, cache conditions were not controlled, there are no paired repetitions, and the comparison was designated after implementation. Run 4 also reused/adapted previously inspected Task A source; it is not described as generating all source from scratch. Run 5's exact publication dependency combination remains unvalidated. The reference supports descriptive comparison, but does not supply the predeclared complete matched evidence required for an efficiency score under the existing policy. Both overall /30 scores therefore remain unassigned.

## Remaining limitations

The published root lockfile lacks three new workspace dependency links. Root lockfile changes were outside the original implementation write boundary. Synchronize it and validate a clean installation against the branch's newer dependencies before treating publication as fully reproducible. Original passing validation applies to the measured seed plus feature changes; publication lint/docs checks are separately recorded. Storage is intentionally process-local and non-durable.

## Evidence

- [Original usage and measurement boundaries](apps/docs/static/evaluation/task-b/usage.json)
- [Estimated cost calculation](apps/docs/static/evaluation/task-b/estimated-cost.json)
- [Rubric assessment](apps/docs/static/evaluation/task-b/final-rubric.json) and [policy](apps/docs/static/evaluation/task-b/rubric-policy.json)
- [Comparison data](apps/docs/static/evaluation/task-b/comparison-4.json)
- [Reference evaluation record snapshot](apps/docs/static/evaluation/task-b/comparison-4-evaluation-record.md), [usage](apps/docs/static/evaluation/task-b/comparison-4-usage.json), and [validation](apps/docs/static/evaluation/task-b/comparison-4-validation.json)
- [Completion report](apps/docs/static/evaluation/task-b/completion-report.txt)
- [Publication limitations](apps/docs/static/evaluation/task-b/publication-notes.txt)
- [Validation logs](apps/docs/static/evaluation/task-b/validation)
- [Complete original source archive](apps/docs/static/evaluation/task-b/task-b-source.zip) and [patch](apps/docs/static/evaluation/task-b/task-b.patch)

Archives and patch are original evaluated artifacts from the declared seed. They are not snapshots of the newer publication branch. No raw Codex conversation logs, secrets, dependencies or generated deployment bundles are published.

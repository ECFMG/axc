# Final Task A rubric — operational assessment

**Final score: 28/30 (93.3%).** This is a post hoc primary-assistant operational assessment after inspecting the pushed baseline evidence. It is not an independent audit or the frozen controlled-experiment score. The six categories are equally weighted, five points each; anchors are in `operational-rubric-policy.json`.

| Category | Score / 5 | Evidence |
| --- | ---: | --- |
| Functional correctness | 5 | All A1–A11 and A-AC1–A-AC12 satisfied; independent Hono and real Azure HTTP oracle each pass 29/29 checks. |
| Tests and validation | 5 | All eight gate groups pass, including 45/45 new API cases, full suite, lint, build, typecheck, architecture and submitted tests/documentation. Full-suite rerun uses 23/26 cached tasks; independent checks and submitted tests execute. |
| Architecture and codebase alignment | 5 | Existing factory, public package exports, Hono boundary and Azure composition preserved. Eight original feature files stay scoped. Cavecrew reviewer found no issues. Fixtures are explicitly allowed. |
| Security and guardrail compliance | 5 | Query validation is exercised. No original-task auth, vendor source, dependency, secret, production-setting or external-integration edits. Original source remains clean. No dedicated security scan claimed. |
| Context/token/cost efficiency | 3 | Mixed measured outcomes against complete direct baseline df-oai-0-out: 14.87% less completed-turn elapsed time, but 27.08% more tokens and 14.27% higher same-rate estimated cost. Complete actor accounting, passing quality and faster wall time support adequate operational performance, not an optimization/savings claim. Single retrospective runs cannot establish causality. |
| Developer workflow fit | 5 | Source archive, applicable patch, documentation, eight-gate evidence, model/medium reasoning settings, complete final-response accounting, separate reviewer and declared limitations are available. |
| **Total** | **28 / 30** | **93.3%** |

## Baseline evidence

`df-oai-0-out` is selected for the primary comparison because it is a complete direct implementation from the same pre-feature base (`fe47c38`) using the same model and medium reasoning. Its complete source-log counters match the committed record. `df-oai-0-a-out` is also inspected; its root record describes an incremental existing-feature run, whose missing final counters are now recovered locally without modifying that source branch.

| Run | Complete tokens | Same-rate estimated USD | Completed-turn elapsed |
| --- | ---: | ---: | --- |
| `df-oai-0-out` direct baseline | 2,303,819 | 0.6490460 | 6m 18.875s |
| `df-oai-0-a-out` incremental baseline, recovered | 2,287,268 | 0.4649696 | 5m 58.877s |
| Current candidate, including reviewer | 2,927,583 | 0.7416588 | 5m 22.550s |

Against the selected direct baseline, the candidate is 56.325 seconds faster (14.87%), but uses 623,764 more tokens (27.08%) and costs an estimated USD 0.0926128 more (14.27%). Against the incremental baseline, it is 36.327 seconds faster (10.12%), uses 27.99% more tokens and costs 59.51% more. Baseline passing quality is reported by committed evidence, not rerun here.

## Supplied 5m 11.098s timing

The user-supplied 5m 11.098s equals the `df-oai-0-a-out` root record’s start at 13:12:17.483Z through provisional counters at 13:17:28.581Z. That record explicitly excludes later original calls and the final response. The original task actually completes at 13:18:16.360Z, producing the complete 5m 58.877s source-log duration. The supplied figure is preserved as a user/snapshot-window measurement, separate from completed-turn elapsed time. Relative to that supplied figure, the current candidate is 11.452 seconds slower (3.68%); those scopes are not equivalent.

## Controlled-policy distinction

The original supplied `RUBRIC_POLICY.json` v1 is unchanged: its strict overall /30 result remains incomplete, with 25/25 assessed and efficiency unscored. It requires matched repeated trials that these historical branches do not provide. The new **28/30 operational grade** uses disclosed post hoc anchors and credits mixed timing/resource outcomes as 3/5. It must not be presented as meeting the frozen policy’s target or demonstrating harness-caused savings.

Historical branch self-assessments (24/30 on `df-oai-0-out`, 23/30 on `df-oai-0-a-out`) used other grading criteria. They are not directly comparable grades. Current source, validation and usage evidence remain unchanged. All comparison/reporting/publication follow-up usage is excluded from original-task totals.

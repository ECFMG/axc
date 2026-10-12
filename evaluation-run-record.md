### Evaluation Run Record

Updated October 12, 2026. The selected model baseline remains **v7.12**. The supplied **v7.12.1** patch and subsequent checks are recorded separately below; no new v7.12.1 Task A model run was performed.

This record describes the original measured baseline at commit `5c3b8dc105bb8b3d81c86828d1e80f31fdd9bccd`. Subsequent application changes align the course implementation, tests, and documentation with `hac-oai-0-a-out` at `509326658517e3b94482415a0bdd7469db702fc8`; they are a manual follow-up and do not change the baseline results or token counts. The original generated files and validation evidence remain preserved under `evidence/v7.12-baseline/` and in the baseline commit.

| Field | Value |
| --- | --- |
| Team | OpenAI / local Ollama evaluation |
| Developer / Operator | Dane Fortun |
| Reviewer |  |
| Harness | OpenAI harness v7.12; exact archive and frozen execution sources preserved |
| Model | gemma4:26b@08ae7ec1744bd7f451c4a530afb39d2673ad9d07a8369b8a33a3613b41212a68/ollama-0.40.0 |
| License / Plan | Not recorded for the local inference run |
| Codebase | ECFMG/axc |
| Task Set | A |
| Run Type | Baseline, repetition 1, relevant_context |
| Harness Engineering Used | Frozen v7.12 harness with structured actions, source guards, retrieval, repairs and independent validation |
| Config / Diff Notes | Cold model unloads; 98,304 context; 4,000 maximum output; 20 calls maximum; 300,000 token budget. The original generated output was committed as measured at `026c008`, without manual repair. Later alignment at `6cd79ab` is separate. All failed and rejected attempts are preserved. |
| Branch / Commit | `df-oai-0-a-out` baseline at `5c3b8dc105bb8b3d81c86828d1e80f31fdd9bccd`; starting commit `fe47c38d32376c5e8bcd1d67838160064fd5de99` |
| Requirements Completed / Attempted | Task A attempted; incomplete. See generated files and validation results; no complete requirements claim. |
| Acceptance Criteria Passed / Total | Not established; baseline did not pass required validation |
| Tests Passed / Failed | Harness regression: 171 passed, 0 failed, 0 skipped. Task A validation groups: 0 passed / 8 failed. Separate live adapter contract checks: 4/4 passed. |
| Static Analysis / Security Findings | See original dependency audit, full validation logs and supplemental checks. Existing audit findings and generated-code failures are preserved; skipped checks are not passes. |
| Input Tokens | 230,100 |
| Cached Tokens | Provider counter unavailable; harness ledger records 0 with verified model unloads |
| Output Tokens | 25,119; separate reasoning counter unavailable |
| Total Tokens or Credits Used | 255,219 Ollama Task A tokens across 19 calls, including retries and rejected responses. Request 20 was blocked before inference. Codex coordination usage is separate. |
| Estimated Cost | **$0.711390 (~$0.71)** hypothetical GPT-6.1-Sol API equivalent: 230,100 input × $2.00/1M + 25,119 output × $10.00/1M. Cached input was not reported, so this estimate assumes zero cached tokens. Actual local Ollama hosting cost is unmeasured. |
| Elapsed Time | Agent execution: 1523.39s; total through evaluation since preparation: 1610.04s |
| Number of Human Interventions / Redirects | Not independently counted for the original baseline. Later manual alignment is not attributed to that baseline. |
| Reviewer Notes |  |
| Final Rubric Score |  |
| Recommendation | Remediate |

## Subsequent runs and checks

These rows identify the implementation and harness each result applies to. Passing follow-up checks do not retroactively change the original v7.12 baseline.

| Run / Check | Implementation / Harness | Recorded Result | Evidence |
| --- | --- | --- | --- |
| Reference-alignment follow-up | Live application aligned at `6cd79ab763ef1dbe445851996a4159015836cb1d` | Archived aggregate verification reaches passing application tests, including 4 HTTP scenarios, then fails dependency audit: 8 advisories (2 critical, 3 high, 3 moderate). Initial typecheck, formatter and test-startup failures are retained. No fresh model-baseline success is claimed. | [Alignment outputs and logs](evidence/v7.12-followups/alignment/) |
| Supplied v7.12.1 release regression | Exact uploaded `openai-harness-v7.12.1.zip`; patch release | 192 tests passed, 0 failed, 0 skipped, 10.555s. Zero live Task A trials and zero live adapter calls in this patch verification. | [Release validation](evidence/v7.12-followups/release/openai-harness-v7.12.1/VALIDATION.json), [test log](evidence/v7.12-followups/release/openai-harness-v7.12.1/TEST_RESULTS.log) |
| Independent Codex verification | Different existing implementation at `903af4937a31972d48139576d13cf5e15fda6c09`; preserved bundle and patch, not applied to this branch | Recorded 11/11 requirements and 12/12 acceptance criteria; 646 unit/integration tests, 3 HTTP scenarios and 19 architecture checks passed. Initial sandbox failure retained. Verification of existing code, not a fresh v7.12 implementation baseline. | [Original evaluation record](evidence/v7.12-followups/independent-codex-verification/evaluation-run-record.md), [results](evidence/v7.12-followups/independent-codex-verification/validation-results.json) |
| Archive and commit verification | Evidence commit `6e67bf84d69355a4190f3ee7357615f48f2987c5` on `df-oai-0-a-out` | 138 remaining source files archived; 445 committed manifest entries verified; portable bundle verified; current application unchanged; no new inference or test runs. | [Catalog](evidence/v7.12-followups/catalog.json), [verification](evidence/v7.12-followups/archive-verification.json), [checksums](evidence/v7.12-followups/SHA256SUMS.json) |

## Codex archival task — completed usage record

This is the operator task that archived existing evidence, not the model's original Task A implementation run. Its final assistant response is included. The current record-update conversation and all other later follow-ups are excluded.

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Dane Fortun |
| Reviewer | |
| Harness | OpenAI Codex CLI `0.162.0-alpha.2` from session metadata; user-declared baseline CLI `v0.162.0` |
| Model | GPT-6.1-Sol; medium reasoning (user-supplied configuration) |
| License / Plan | ChatGPT Business, Pro Lite seat (user-supplied) |
| Codebase | ECFMG/axc |
| Task Set | A — TS-A-CATALOG-SEARCH evidence archival |
| Run Type | Operator follow-up: archive existing runs/tests, without a new model baseline |
| Harness Engineering Used | No new harness engineering or subagents; exact supplied v7.12.1 release archived separately |
| Config / Diff Notes | Original v7.12 failed run, alignment logs, independent verification and patch regression retain distinct provenance. Read-only reference `hac-oai-0-a-out` remains at `509326658517e3b94482415a0bdd7469db702fc8`. |
| Branch / Commit | `df-oai-0-a-out` at archive commit `6e67bf84d69355a4190f3ee7357615f48f2987c5`; this record update is a subsequent evidence/documentation commit |
| Requirements Completed / Attempted | Existing evidence archived and verified. No new A1–A11 implementation attempted. |
| Acceptance Criteria Passed / Total | Not applicable to the archival task; original baseline results remain as stated above |
| Tests Passed / Failed | Zero new test runs; verified 445 archived manifest entries and the portable Git bundle. Historical results appear separately above. |
| Static Analysis / Security Findings | No new security-assurance claim; historical diagnostic and audit findings preserved |
| Input Tokens | 2,292,912, including cached input |
| Cached Tokens | 2,192,000, included in input; uncached input 100,912 |
| Output Tokens | 13,679, including 2,774 reasoning output tokens |
| Total Tokens or Credits Used | 2,306,591 recorded Codex tokens. Zero Ollama calls in this task. Combined recorded task total: 2,306,591 tokens, a sum across providers rather than monetary cost. |
| Estimated Cost | **$0.557814 (~$0.56)** GPT-6.1-Sol API equivalent: 100,912 uncached input × $2.00/1M + 2,192,000 cached input × $0.10/1M + 13,679 output × $10.00/1M. Illustrative estimate, not measured ChatGPT billing. |
| Projected Token Estimate | 200,000–800,000 Codex tokens; assumed inspection, archival, relevant verification and committing, with no new Ollama inference. Actual usage exceeded the projection. Estimates are excluded from measured totals. |
| Elapsed Time | 7m 44.702s, 2026-10-12 11:53:44.721–12:01:29.423 EDT, through final task completion |
| Number of Human Interventions / Redirects | 1 clarification response selecting archival of existing runs/tests; no new baseline run |
| Reviewer Notes | |
| Final Rubric Score | |
| Recommendation | Archive complete; retain Remediate for the original model baseline |

Accounting source: local JSONL session `01a130d1-2b49-77e2-9197-5c52961e9791`, original turn `01a130d1-e608-7a80-9c14-d9a7af8043ab`, log `/Users/dfortun/.codex/sessions/2026/10/12/rollout-2026-10-12T11-52-56-01a130d1-2b49-77e2-9197-5c52961e9791.jsonl`. Fresh-session starting counters were zero. Ending cumulative counters at `2026-10-12T16:01:29.419Z` minus those starting counters yield the recorded usage. Cumulative snapshots were not summed. Scope includes initial measurement inspection, planning, packaging, validation, Git operations and reporting, including the final assistant response. See [completed usage.json](evidence/v7.12-followups/usage.json).

Other accounting remains separate: the original Ollama baseline reports 255,219 tokens; four historical adapter checks report 514 tokens. The overlapping shared retry-accounting aggregate is not added again. Ollama's separate cache/reasoning counters are unavailable. The earlier commit-verification task's final response has been recovered, but its interrupted startup remains unmeasured. The independent verification's original usage snapshot excludes packaging/final-response work and its source log was unavailable for recovery; it remains incomplete. See [earlier-task recovery](evidence/v7.12-followups/previous-task-usage-recovery.json). No missing counters were replaced by estimates.

## Estimated API cost calculation

Rates supplied by the user: **$2.00 input / $0.10 cached input / $10.00 output per 1M tokens**. Since cached tokens are already included in the input count, the calculation is:

`((input − cached input) × 2.00 + cached input × 0.10 + output × 10.00) / 1,000,000`

Reasoning output is already included in output tokens and is not charged again.

| Recorded Scope | Uncached Input | Cached Input Used | Output | Input Cost | Cached Cost | Output Cost | Estimated API Equivalent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Original v7.12 Ollama baseline, hypothetical GPT API comparison | 230,100 | 0 assumed; provider counter unavailable | 25,119 | $0.460200 | $0.000000 | $0.251190 | **$0.711390 (~$0.71)** |
| Completed Codex archival task | 100,912 | 2,192,000 | 13,679 | $0.201824 | $0.219200 | $0.136790 | **$0.557814 (~$0.56)** |
| Completed Codex evaluation-record update | 11,500 | 870,656 | 6,276 | $0.023000 | $0.0870656 | $0.062760 | **$0.1728256 (~$0.17)** |

The two completed Codex tasks total **3,195,023 recorded tokens** and **$0.7306396 (~$0.73)** in estimated API equivalent cost. Both include their final assistant responses. This subtotal excludes the current cost-correction conversation and the separate Ollama baseline comparison. These are calculated estimates at the supplied rates; actual subscription charges and local hosting cost remain unmeasured. Full arithmetic, measurement scopes and assumptions are saved in [cost-estimates.json](evidence/v7.12-followups/cost-estimates.json).

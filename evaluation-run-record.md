### Evaluation Run Record

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
| Config / Diff Notes | Cold model unloads; 98,304 context; 4,000 maximum output; 20 calls maximum; 300,000 token budget. All failed and rejected attempts preserved. Generated output is committed as measured, without manual feature repair. |
| Branch / Commit | `df-oai-0-a-out` baseline at `5c3b8dc105bb8b3d81c86828d1e80f31fdd9bccd`; starting commit `fe47c38d32376c5e8bcd1d67838160064fd5de99` |
| Requirements Completed / Attempted | Task A attempted; incomplete. See generated files and validation results; no complete requirements claim. |
| Acceptance Criteria Passed / Total | Not established; baseline did not pass required validation |
| Tests Passed / Failed | Harness regression: 171 passed, 0 failed, 0 skipped. Task A validation groups: 0 passed / 8 failed. Separate live adapter contract checks: 4/4 passed. |
| Static Analysis / Security Findings | See original dependency audit, full validation logs and supplemental checks. Existing audit findings and generated-code failures are preserved; skipped checks are not passes. |
| Input Tokens | 230100 |
| Cached Tokens | Provider counter unavailable; harness ledger records 0 with verified model unloads |
| Output Tokens | 25119; separate reasoning counter unavailable |
| Total Tokens or Credits Used | 255219 Ollama Task A tokens, including retries/rejections; coordinating Codex commit-task usage is separate in usage.json |
| Estimated Cost | Unmeasured; no price inferred from token counts |
| Elapsed Time | Agent execution: 1523.39s; total through evaluation since preparation: 1610.04s |
| Number of Human Interventions / Redirects | Not independently counted for prior run; no manual feature edits by this commit task |
| Reviewer Notes |  |
| Final Rubric Score |  |
| Recommendation | Remediate |

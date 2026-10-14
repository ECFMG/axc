### Evaluation Run Record

Updated October 14, 2026. The selected model baseline remains **v7.12**. Task A model run was performed on v7.12.

### Evaluation Run Record

One record for the original Task A implementation run. Follow-up questions, cost calculation, packaging, and this push are excluded from its usage and elapsed-time measurements.

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Dane Fortun, [dfortun] (local operator identifier); implementation by Codex |
| Reviewer | |
| Harness | Codex Desktop direct implementation; openai-harness-v7.12 supplied checks used for independent verification |
| Model | gpt-6.1-sol Medium Reasoning (recorded session model) |
| License / Plan | Not independently verified; session rate-limit metadata labels plan as `self_serve_business_prolite` |
| Codebase | ECFMG/axc |
| Task Set | A — TS-A-CATALOG-SEARCH |
| Run Type | Baseline — direct Codex implementation |
| Harness Engineering Used | No harness changes or harness-driven model generation. v7.12 course oracle and submitted-test/documentation gates used; harness self-tests also run. |
| Config / Diff Notes | 11 application/test/docs files changed against fe47c38. Local fixture search with Hono and existing Azure adapter; no new dependencies, protected configuration, authentication, external integration, or Cellix changes. Documentation is linked in the sidebar. |
| Branch / Commit | `df-oai-0-a-out`; archived implementation commit `f3fa66fdb2672b6817520e338a030ba1d8fcfb16`; validated implementation preserved in the attached source ZIP, patch, and Git bundle; the destination branch application remains unchanged. |
| Requirements Completed / Attempted | All 12 prompt requirements; A1–A11, required Course model and 12 varied fixtures completed. |
| Acceptance Criteria Passed / Total | 12 / 12 (A-AC1–A-AC12); independent oracle 29/29 Hono and 29/29 Azure HTTP checks. |
| Tests Passed / Failed | Final full suite: 700 Vitest tests, 3 API Node tests, 1 health acceptance scenario passed; 0 failed. Architecture: 19 passed. Harness: 171 passed, 0 failed, 0 skipped. Submitted-test gate separately reran 56 new Vitest cases and 3 Node cases successfully; these overlap the full suite and are not additive. |
| Static Analysis / Security Findings | Lint: 201 files, no findings; typecheck/build/changed-file formatting/diff checks passed. Allowed-path check passed. No dedicated security scan performed; no claim of a security audit. |
| Input Tokens | 2,359,033 (includes cached input) |
| Cached Tokens | 2,270,976 (subset of input) |
| Output Tokens | 17,585 (includes 2,393 reasoning output tokens) |
| Total Tokens or Credits Used | 2,376,618 recorded tokens; credits unmeasured; no subagents. Original final response included; follow-ups excluded. |
| Estimated Cost | USD $0.5790616 (about $0.58), calculated from recorded usage and user-supplied rates; actual billed amount unmeasured. |
| Elapsed Time | 361.470 seconds (6 minutes 1.470 seconds) — 2026-10-14 19:06:42.430 UTC through 19:12:43.900 UTC. |
| Number of Human Interventions / Redirects | 0 during the original measured implementation turn. Subsequent destination/cost/push instructions are excluded. |
| Reviewer Notes | |
| Final Rubric Score | 87/100 |

| Category | Score | Basis |
|---|---:|---|
| Functional correctness | 5/5 | All 12 acceptance criteria satisfied |
| Tests and validation | 5/5 | Required checks and independent API tests passed |
| Architecture and codebase alignment | 4/5 | Existing composition patterns followed; architecture checks passed; independent design review pending |
| Security and guardrail compliance | 5/5 | Allowed paths respected; no authentication, dependency, or protected configuration changes |
| Context/token/cost efficiency | 3/5 | Approximately $0.58, but 2.38M tokens versus the 250K projection |
| Developer workflow fit | 4/5 | Committed source, documentation, reproducible evidence, and complete usage accounting; some environment setup friction ||
| Recommendation | Continue — sample-task implementation and validation complete. |

### Measurement and cost basis

`usage.json` records the source session log, original turn ID, cumulative starting/ending counters, boundaries, and completeness. The fresh session begins with this task: the zero baseline is established by session origin, rather than an explicit pre-task token-count snapshot. Actual usage is ending cumulative counters minus the starting counters; snapshots are never summed. `usage-snapshots.json` preserves the recorded counter evidence. The original final response was recovered on the next user message. Accounting is complete for that original turn.

The initial projection was 250,000 total tokens, range 150,000–500,000, assuming one agent and approximately 10–20 calls with a runnable local codebase. It was an estimate, not measured usage; repeated input context and the actual 29 usage events were underestimated.

Using the supplied screenshot rates, 88,057 uncached input tokens cost $0.176114; 2,270,976 cached input tokens cost $0.2270976; 17,585 output tokens cost $0.17585. Recorded cache-write input is zero. No individual input call exceeded the screenshot's 272K threshold. Total estimated token cost is $0.5790616. Cached input and reasoning output are not added twice. See `cost-estimate.json`; no actual invoice, dollar charge, or credit counter was measured.

### Source and execution notes

The supplied ZIP contains the evaluation harness, not the AXC application. The existing local `/Users/dfortun/axc` repository already had a previous Task A implementation. A separate clone started from its preceding commit `fe47c38d32376c5e8bcd1d67838160064fd5de99`; no prior solution was copied. The supplied task documents match the archive bytes, and all 93 archive-manifest file hashes verify. `provenance.json` contains source hashes.

Offline dependency installation was blocked by a missing cached tarball. Existing installed dependencies were copied with filesystem clones and relative workspace links preserved; the lockfile was unchanged. Localhost tests required sandbox elevation. An initial test assertion compared case-sensitive title order and was corrected to the documented case-insensitive order. Harness AST test setup was corrected to point to `typescript/lib/typescript.js`. All reported final validations passed. Historical failed/setup attempts are described here and in `validation.json`; the adjacent logs hold the final successful executions.

### Publication to the existing output branch

The destination `df-oai-0-a-out` already contains a different implementation and historical evaluations. This run is archived independently; publishing its evidence does not replace that application or attribute this run's results to it. `task-a-source.zip` contains the exact validated source tree and `task-a-implementation.bundle` preserves implementation commit f3fa66f and branch history. `submitted/tests-00.jsonl` contains the original Node reporter bytes, renamed from the harness-generated `.json` filename because its content is newline-delimited JSON. Historical absolute report paths refer to the original execution workspace.

### Evidence

- `validation.json`, `REPORT.txt`, and `task-a.patch`: requirements, implementation notes, commands, environment limitations, and source diff.
- `test.log`, `lint.log`, `build.log`, `typecheck.log`, `architecture.log`: required repository checks.
- `acceptance-hono.json`, `acceptance-host.json`: independent endpoint checks.
- `submitted/result.json` and reports: independently executed submitted tests and documentation gate.
- `harness-tests.log`: 171 harness self-tests.
- `usage.json`, `usage-snapshots.json`, `cost-estimate.json`: measured counters and separately calculated cost.
- Task documents, the original evaluation-record template, harness version/manifest, and `provenance.json`: specification and source provenance.

No remaining implementation or validation blockers.

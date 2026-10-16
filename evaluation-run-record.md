### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | Duy Nguyen |
| Reviewer | Codex evaluation on 2026-10-16 |
| Harness | Codex with repository `AGENTS.md`, harness run workflow, Cellix architecture skill, architecture tests, and repository verification gate |
| Model | `gpt-6-sol` (medium) |
| License / Plan | Business (`self_serve_business_prolite`), authenticated with ChatGPT |
| Codebase | ECFMG/axc |
| Task Set | B (including Task Set A course search) |
| Run Type | Harness Engineering Iteration 6 |
| Harness Engineering Used | Repository instructions, bounded run workflow, Cellix reference mapping, reusable architecture tests, acceptance harness, and `pnpm run verify` gate. Relative to the `dn-oai-0-b-out` baseline, these controls accompanied stronger architecture and broader validation. |
| Config / Diff Notes | Commit `632980d664f168dccc1debcf7ea5975783d1e023` adds the `training` context across domain, application services, persistence, REST, API composition, acceptance tests, and docs. It uses a Cellix aggregate, value objects, seedwork repository/unit-of-work contracts, and focused domain tests. The lockfile diff matches declared workspace/test dependencies. Harness/evaluation edits remain outside the feature commit. |
| Branch / Commit | `dn-oai-6-b-out` at `632980d664f168dccc1debcf7ea5975783d1e023` (`output of harness 6`) |
| Requirements Completed / Attempted | 28 / 28 functional requirements represented in code; two test-adequacy acceptance criteria remain unproven |
| Acceptance Criteria Passed / Total | 25 / 27 across Task Sets A and B; A-AC11 and B-AC14 lack discriminating filter coverage, despite the corresponding filter behavior being implemented |
| Tests Passed / Failed | Fresh domain 9/9, application services 16/16, persistence 2/2; architecture 32/32 from Turbo cache; acceptance 4/4 scenarios on an unchanged rerun outside the process sandbox. All feature tests passed. `pnpm run test` reported 28/29 Turbo tasks in the sandbox because the local API host could not start there. |
| Static Analysis / Security Findings | `pnpm run verify` did not complete because repository-wide Biome reported formatting outside the evaluated feature scope. Individually, typecheck 23/23 and build 18/18 passed from Turbo cache, Knip had no actionable findings and 33 configuration hints, and Biome passed 324 files in `apps`, `packages`, and the lockfile. Audit found 1 moderate and 2 policy-ignored high advisories. Snyk reported SKIPPED because its CLI is absent; this scan is excluded from evaluation scoring, not counted as a pass. No feature-attributable boundary violation, secret, production integration, or unsafe dependency change was found. |
| Input Tokens | 15,540,938, including cached input (user-provided session summary) |
| Cached Tokens | 15,365,632 input tokens (98.9% of input); cache-write input tokens: 0 |
| Output Tokens | 43,208, including 7,276 reasoning output tokens |
| Total Tokens or Credits Used | 15,584,146 total tokens; credits unavailable in the local session log. Source: user-provided summary for session `01a14565-8877-7412-bf23-a758774837c2` |
| Estimated Cost | Unavailable |
| Elapsed Time | 12m 43s active; 12m 44s wall (2026-10-16 15:47:40.985Z to 16:00:24.874Z) |
| Number of Human Interventions / Redirects | Prior evaluation reports 0 for the original generation run; post-run cleanup and evaluation were required |
| Reviewer Notes | Compared with the 67/100 Task Set B baseline on `dn-oai-0-b-out`, this run adds a Cellix-aligned aggregate and data-source structure plus domain, adapter, architecture, and HTTP acceptance tests. The score rises 23 points to 90/100. Filter tests could be more discriminating, and the full repository verification gate remains incomplete. The run used 9.6× as many total tokens and 2.75× as much wall time as baseline; dollar cost is unknown. Existing audit advisories remain visible; Snyk is excluded from scoring. Vendor readiness is held at the baseline's 3/5 because the plan and approval evidence are unchanged. |
| Final Rubric Score | 90 / 100 |
| Recommendation | Remediate |

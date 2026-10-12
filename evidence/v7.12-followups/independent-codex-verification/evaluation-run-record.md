### Evaluation Run Record

Verification date: October 12, 2026. This run verified an existing implementation; it is not a fresh implementation benchmark.

| Field | Value |
| --- | --- |
| Team | OpenAI |
| Developer / Operator | User (name not supplied); Codex executed validation |
| Reviewer | |
| Harness | Codex desktop; lean-build skill; no subagents |
| Model | gpt-6.1-sol (from local session metadata) |
| License / Plan | Unavailable |
| Codebase | ECFMG/axc |
| Task Set | A — TS-A-CATALOG-SEARCH |
| Run Type | Final verification of existing implementation |
| Harness Engineering Used | No new harness engineering; existing repository test/build tooling |
| Config / Diff Notes | Original source checkout clean and unchanged. Isolated local clone, copied installed dependencies, no dependency install. Documentation updated with current results. First full-suite attempt hit sandbox socket restrictions; rerun with local-server access passed. MongoDB downloads disabled; installed binary used. |
| Branch / Commit | `codex/task-set-a-evaluation-2026-10-12` in isolated clone. Feature commit `d6153e2f09645297fc17749a438e7728d9754fe0`; prior validation commit `c913767`; current validation documentation commit `903af4937a31972d48139576d13cf5e15fda6c09`. |
| Requirements Completed / Attempted | 11 / 11 (A1–A11); all 12 prompt requirements satisfied by existing implementation |
| Acceptance Criteria Passed / Total | 12 / 12 (A-AC1–A-AC12) |
| Tests Passed / Failed | Final full suite: 646 unit/integration tests passed, 0 failed; 3 HTTP acceptance scenarios passed, 0 failed. Separately: 19 architecture checks passed. Course-specific coverage: 46 route tests, 3 application-service tests, 2 HTTP scenarios. Initial sandbox-restricted attempt failed during local-server startup; retained separately. |
| Static Analysis / Security Findings | Lint passed (202 files); typecheck passed (21 tasks); architecture checks passed. No security scan or dependency audit performed; no security-assurance claim. |
| Input Tokens | 951,606 through snapshot |
| Cached Tokens | 913,792 (included in input) |
| Output Tokens | 5,500 through snapshot; includes 1,578 reasoning tokens |
| Total Tokens or Credits Used | 957,106 tokens through snapshot; credits unavailable |
| Estimated Cost | Unavailable; no rate or billed charge exposed |
| Elapsed Time | 4.7 minutes through record creation; task began 2026-10-12T15:30:15.134Z |
| Number of Human Interventions / Redirects | 1 clarification to explicitly follow the supplied documents; no later redirects |
| Reviewer Notes | |
| Final Rubric Score | |
| Recommendation | Candidate for Pilot (reviewer assessment pending) |

Usage is a measured difference between the last cumulative token counter before authorization and the latest counter at 2026-10-12T15:34:01.308Z. It excludes later packaging work and the final assistant response. Counts are not monetary charges. The accompanying `usage.json` retains both counters and the calculation.

The run includes logs for `pnpm test --force` (initial restricted attempt and successful rerun), `pnpm run lint`, `pnpm run build --force`, `pnpm run typecheck`, and `pnpm run test:arch`. The successful test command used runtime-only environment variables for installed MongoDB binary selection, disabled downloads, and telemetry opt-outs. No source or production configuration changes were required.

Implementation limits: twelve read-only in-memory fixtures; case-insensitive substring search; exact tag matching; deterministic ascending sort with ID tie-break; no catalog mutation or database integration.

# Course search validation

Validated on 2026-09-29 with Node 24.19.0 and pnpm 11.19.0. The repository declares pnpm 11.9.0; the available bundled pnpm was used. Existing lockfile dependencies were installed without lifecycle scripts or lockfile changes.

| Check | Result |
| --- | --- |
| `pnpm test` | **Failed / environment blocked.** Existing MongoDB integration setup cannot create its missing binary cache. This is not a full-suite pass. |
| `pnpm run lint` | Passed. |
| `pnpm run build` | Passed: all 18 build tasks, including the API bundle and Docusaurus. |
| `pnpm run typecheck` | Passed. |
| `pnpm run test:arch` | Passed: 9 AXC architecture checks and 10 shared architecture checks. |
| `pnpm --filter @apps/api test` | Passed: 46 Hono route tests, with TypeScript checking of the test source. |
| `pnpm exec turbo run test --filter='!@cellix/mongoose-seedwork'` | Passed: all 23 selected tasks. This excludes the MongoDB package and does not invoke acceptance tests. |
| `pnpm run knip` | Passed after removing one unnecessary type export. Existing configuration hints remain. |
| Changed TypeScript/JSON files: `pnpm exec biome check …` | Passed. |
| `node scripts/check-script-policy.mjs` | Passed. |
| `git diff --check` | Passed. |
| Teaching/coding harness: `python3 -B -m unittest discover -v` | Passed: 124 tests, including 11 new coding-runner tests. |

The new feature adds 46 route tests, three application-service tests, and two host acceptance scenarios. The existing health service and Hono health-route checks pass. Vitest also checks the application-service test types.

## Remaining validation limits

The full test command stops in unchanged `packages/cellix/mongoose-seedwork/tests/integration/mongo-unit-of-work.integration.test.ts`. Its MongoDB memory-server setup encounters `EPERM` creating `/Users/dfortun/.cache/mongodb-binaries`; teardown then attempts to stop an uninitialized server. No source in that package was changed. Its log reports 145 passing tests and 20 skipped integration tests.

The existing acceptance workflow also requires Azure Functions Core Tools (`func`) and a Java runtime for its Serenity report. `func` is absent from the available PATH. The new HTTP acceptance scenarios were typechecked but not executed against the Azure host. The user explicitly chose to leave missing test runtimes uninstalled and document the blockers.

Acceptance criterion A-AC10 (all existing tests pass) remains unverified. Required command outputs have been captured, but the Task Set A run is deliberately marked **NOT PASSED**. Do not treat the narrower green checks as a replacement for the blocked full suite. No test exclusions were added to repository configuration.

## Reproduction

On a machine with the repository's documented MongoDB test runtime, Azure Functions Core Tools v4 and a JRE, rerun the five root commands above. Keep the original specification and prompt fixed. Existing fixtures require no production data or application service credentials.

The coding-runner evidence includes the initial failure, final command outputs, starting commit, specification hash and allowed-path audit. Provider token counts and model cost are unavailable for this Codex session. There is no baseline-versus-optimized coding experiment and no measured savings claim.

Dependency lifecycle scripts remained disabled. The checkout had no active pre-commit hook installed; no hook was bypassed. The broader root `verify` command was not run because it includes network-dependent e18e, audit and Snyk checks outside this task's approved local validation scope.

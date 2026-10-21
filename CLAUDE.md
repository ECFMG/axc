# agentCourses (axc)

Non-production sample codebase used to evaluate agentic coding harnesses. Every change must pass `pnpm run verify`. Architecture follows CellixJS. See `README.md` for the full command reference.

## Layout and dependency direction

| Package | Role | May import |
| --- | --- | --- |
| `packages/axc/domain` | Aggregates, entities, value objects, visas/passport, repository and UoW interfaces (`@cellix/domain-seedwork`) | `@cellix/domain-seedwork` only |
| `packages/axc/service-mongoose` | Mongoose models, seed data, `ServiceMongoose` infrastructure service (Cellix data-sources-mongoose-models role) | mongoose, `@cellix/mongoose-seedwork`. Never domain/persistence/application-services/rest |
| `packages/axc/persistence` | Domain adapters, repositories, units of work, readonly data sources, `DataSourcesFactory` | domain, service-mongoose |
| `packages/axc/application-services` | Use cases in `src/contexts/**`. `ApplicationServices`, `ApiContext`, `buildApplicationServicesFactory` | domain, persistence. Never mongoose, hono, `@azure/*` |
| `packages/axc/rest` | Hono routes, HTTP input validation, Azure handler. Holds no state | application-services only |
| `apps/api` | Composition root (`src/index.ts`): Cellix bootstrap wires infrastructure → context → application services → REST | everything |
| `packages/axc-verification/archunit-tests` | Fitness tests: Cellix convention suites plus layer imports, Cellix file placement, Hono↔Azure route parity, composition root, requirement traceability | |
| `packages/axc-verification/acceptance-api` | Serenity/Cucumber features that drive the real `@apps/api` host over HTTP | |
| `packages/cellix/*` | Vendored CellixJS packages. Read-only | |

Workspace packages export from `dist/`; turbo builds dependencies before typecheck/test. Unit tests live next to code as `*.test.ts` (vitest).

## Adding a feature or HTTP endpoint (checklist)

Load the `axc-feature` skill first. It gives the exact Cellix file names, base classes and wiring, with a validated example in `.claude/skills/axc-feature/reference.md`, so you don't need to explore `packages/cellix/*`.

1. Domain context in `domain/src/domain/contexts/<ctx>/<agg>/`; Mongoose model and seed in `service-mongoose`; adapters, repository, UoW and readonly data source in `persistence`. Storage is Mongoose (an in-process replica set locally and in tests), not in-memory arrays.
2. Use case in `application-services/src/contexts/<ctx>/<agg>/` as `(dataSources: DataSources) => async (command) => result`, composed into `ApplicationServices`.
3. Hono route in `rest` with its full path; HTTP input validation (400s) lives here. Unit-test it with `createRestApp(stub).request(...)`.
4. Register the Azure Function route in `apps/api/src/index.ts` with `.registerAzureFunctionHttpHandler(name, { route, methods, authLevel: 'anonymous' }, restHandlerCreator)`. `host.json` sets `routePrefix: ""`, so the route is the full path; use Azure route templates (`{id}`) for parameters. The arch suite fails on any Hono route without a registration and vice versa.
5. A `.feature` file + step definitions in `acceptance-api` following `healthcheck.feature` / `healthcheck.steps.ts` (screenplay: `actorCalled`, `Send`, `LastResponse`, `Ensure`). Never import `@axc/*` or Hono there.
6. Tag the test that proves each acceptance criterion with its ID: `@A-AC3` on the Cucumber scenario, or `A-AC3` in the vitest test name. The arch suite and the Stop hook fail on any criterion of the task set without one.
7. Docs page in `apps/docs/docs/` (see `healthcheck.md`) and add it to `apps/docs/sidebars.ts` if needed.

Edit existing tests only when the wiring forces it (e.g. `health.test.ts` needs a stub `dataSourcesFactory` once `ApiContext` requires one).

## Commands

- `pnpm run verify:fast`: biome, typecheck, arch tests, unit tests. Use this while iterating.
- `pnpm run verify`: the full gate (adds build, knip, e18e, Serenity acceptance, audit, Snyk). Must pass before you finish.
- Both print one line per step and only the tail of a failing step. Full logs: `node_modules/.cache/axc-verify/logs/<step>.log`. Read those rather than re-running with more output.
- audit/Snyk: findings already present when the session started are printed as pre-existing and do not fail the gate; only findings your change introduces fail it. Never try to fix pre-existing ones (`pnpm audit --fix`, `snyk ignore`, overrides, `.snyk`, toolchain files are root files and blocked); list them under Known limitations.
- Single package: `pnpm --filter @axc/<pkg> run typecheck` / `pnpm exec turbo run test --filter=@axc/<pkg>`.
- pnpm only (no npm/npx/yarn). Dependency scripts are disabled and must stay disabled.

## Hard rules (breaking any is a failed run)

- Write only inside the task's write boundary: `apps/api`, `apps/docs`, `packages/axc/{domain,persistence,service-mongoose,application-services,rest}`, `packages/axc-verification`. Do not create new directories directly under `packages/axc/`.
- Never modify existing `packages/cellix/*` packages. Porting a new, unmodified package from CellixJS is allowed.
- Never change rules in `biome.json` or any `tsconfig*.json`. Change the code to satisfy the rules. A package that needs a missing config (e.g. `rest/tsconfig.vitest.json` for tests) copies an existing package's file byte for byte.
- No `@ts-ignore`, `@ts-expect-error`, `biome-ignore`, skipped/focused tests, or `--no-verify`.
- No new dependencies unless clearly justified; state the justification in the summary.
- Don't touch auth, production config, CI, secrets/env files, or the harness (`CLAUDE.md`, `.claude/`, `.mcp.json`, `scripts/`).

Hooks in `.claude/settings.json` enforce these rules: blocked edits/commands explain why, and Biome auto-formats each file after you edit it (re-read before editing again). The Stop hook will not let you finish until the diff is inside the boundary, every acceptance criterion of the task set has a tagged test, and `pnpm run verify` has passed on the exact current code, so run it yourself as your last step.

## Working method

1. Read the task prompt and its requirements file in full. List every numbered requirement and acceptance criterion before writing code.
2. Implement layer by layer (domain → service-mongoose → persistence → application-services → rest → api wiring), running `verify:fast` as you go.
3. Make sure each requirement has a test that proves it, then run `pnpm run verify`.

## Final summary format

End with this, filled in honestly (report failures and skips as they are):

```
### Summary
Task Set: <ID>
Requirements completed: <n>/<total>. List any not done or partially done.
Acceptance criteria passed: <n>/<total>
Changes: <files/areas changed, one line each>
Dependencies added: <none | name + justification>
Commands run: <commands and their final result>
Tests: <unit passed/failed, arch passed/failed, acceptance scenarios passed/failed>
Static analysis / security: <biome, knip, e18e, audit, snyk results; note Snyk SKIPPED if so>
Cost / usage: token counts aren't visible to the agent; the operator should read `/cost` for this session.
Known limitations: <list>
```

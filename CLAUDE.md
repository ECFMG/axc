# agentCourses (axc)

Non-production sample codebase used to evaluate agentic coding harnesses. Every change must pass `pnpm run verify`. Architecture follows CellixJS. See `README.md` for the full command reference.

## Layout and dependency direction

| Package | Role | May import |
| --- | --- | --- |
| `packages/axc/domain` | Entities, value objects, domain rules, repository interfaces (`@cellix/domain-seedwork`) | seedwork only. Never hono, `@azure/*`, mongoose, or other `@axc/*` packages |
| `packages/axc/persistence` | Repository implementations / unit of work | domain |
| `packages/axc/service-mongoose` | Mongoose infrastructure (`@cellix/mongoose-seedwork`) | domain, persistence |
| `packages/axc/application-services` | Use cases. `ApplicationServices`, `ApiContext`, `buildApplicationServicesFactory` | domain, persistence |
| `packages/axc/rest` | Hono routes + Azure handler. Receives the application services factory; holds no state | application-services |
| `apps/api` | Composition root (`src/index.ts`): Cellix bootstrap wires infrastructure → context → application services → REST | everything |
| `packages/axc-verification/archunit-tests` | Layering fitness tests (these enforce the table above) | |
| `packages/axc-verification/acceptance-api` | Serenity/Cucumber features that drive the real `@apps/api` host over HTTP | |
| `packages/cellix/*` | Vendored CellixJS packages. Read-only | |

Workspace packages export from `dist/`; turbo builds dependencies before typecheck/test. Unit tests live next to code as `*.test.ts` (vitest).

## Adding an HTTP endpoint (checklist)

1. Domain types and rules in `domain`; storage in `persistence` / `service-mongoose`.
2. Use case on `ApplicationServices` in `application-services`, built in `buildApplicationServicesFactory`.
3. Hono route in `rest` calling `applicationServicesFactory.forRequest(...)`.
4. Register the Azure Function route in `apps/api/src/index.ts` with `.registerAzureFunctionHttpHandler(name, { route, methods, authLevel: 'anonymous' }, restHandlerCreator)`. `host.json` sets `routePrefix: ""`, so the route is the full path; use Azure route templates (`{id}`) for parameters. A Hono route without a matching registration is unreachable.
5. Unit tests in the package; a `.feature` file + step definitions in `acceptance-api` following `healthcheck.feature` / `healthcheck.steps.ts` (screenplay: `actorCalled`, `Send`, `LastResponse`, `Ensure`). Never instantiate Hono or application services inside acceptance tests.
6. Docs page in `apps/docs/docs/` (see `healthcheck.md`) and add it to `apps/docs/sidebars.ts` if needed.

## Commands

- `pnpm run verify:fast`: biome, typecheck, arch tests, unit tests. Use this while iterating.
- `pnpm run verify`: the full gate (adds build, knip, e18e, Serenity acceptance, audit, Snyk). Must pass before you finish.
- Both print one line per step and only the tail of a failing step. Full logs: `node_modules/.cache/axc-verify/logs/<step>.log`. Read those rather than re-running with more output.
- Single package: `pnpm --filter @axc/<pkg> run typecheck` / `pnpm exec turbo run test --filter=@axc/<pkg>`.
- pnpm only (no npm/npx/yarn). Dependency scripts are disabled and must stay disabled.

## Hard rules (breaking any is a failed run)

- Write only inside the task's write boundary: `apps/api`, `apps/docs`, `packages/axc/{domain,persistence,service-mongoose,application-services,rest}`, `packages/axc-verification`. Do not create new directories directly under `packages/axc/`.
- Never modify existing `packages/cellix/*` packages. Porting a new, unmodified package from CellixJS is allowed.
- Never change rules in `biome.json` or any `tsconfig*.json`. Change the code to satisfy the rules.
- No `@ts-ignore`, `@ts-expect-error`, `biome-ignore`, skipped/focused tests, or `--no-verify`.
- No new dependencies unless clearly justified; state the justification in the summary.
- Don't touch auth, production config, CI, secrets/env files, or the harness (`CLAUDE.md`, `.claude/`, `.mcp.json`, `scripts/`).

Hooks in `.claude/settings.json` enforce these rules: blocked edits/commands explain why, and Biome auto-formats each file after you edit it (re-read before editing again). The Stop hook will not let you finish until the diff is inside the boundary and `pnpm run verify` has passed on the exact current code, so run it yourself as your last step.

## Working method

1. Read the task prompt and its requirements file in full. List every numbered requirement and acceptance criterion before writing code.
2. Implement layer by layer (domain → persistence → application-services → rest → api wiring), running `verify:fast` as you go.
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

# agentCourses

Start from the files below before searching. Read only the task files named in your prompt; ignore other `task-set-*.md` files, `super-prompt.md`, `evaluation-run-record.md`, and `.agents/skills/`.

## Boundary and bans

- Write only `apps/api/**`, `apps/docs/**`, `packages/axc/{domain,persistence,service-mongoose,application-services,rest}/**`, `packages/axc-verification/**`, and `.agents-work/` (gitignored scratch, logs only). Do not add directories under `packages/axc/`.
- `packages/cellix/**`: never modify existing files (they match upstream CellixJS). Port a new Cellix package only if the task cannot be done without it. Open a cellix file only when a symbol imported by a slice file is not defined there, and open that module only.
- Never edit `.env`, secrets, authentication, or deploy config (including `apps/api/host.json`).
- No third-party dependencies. A `workspace:*` dependency on another `@axc/*` package is allowed; then run `pnpm install`. Never otherwise edit dependency fields, the lockfile, `.snyk`, or audit config.
- Never change biome, tsconfig, knip, vitest, cucumber, or archunit config to make a check pass. Add a biome-ignore only with a reason, matching existing ones.

## Copy the health slice

- Use case: `packages/axc/application-services/src/index.ts`, `packages/axc/application-services/src/health.test.ts`
- Route: `packages/axc/rest/src/index.ts`
- Composition: `apps/api/src/index.ts`, `apps/api/src/service-config/runtime/index.ts`
- Acceptance: `packages/axc-verification/acceptance-api/src/features/healthcheck.feature`, `packages/axc-verification/acceptance-api/src/step-definitions/healthcheck.steps.ts`
- Boot stays: `packages/axc-verification/acceptance-api/src/infrastructure.ts`
- Storage, only if the feature stores data: `packages/axc/domain/src/index.ts`, `packages/axc/persistence/src/index.ts`, `packages/axc/service-mongoose/src/index.ts`
- Docs: copy `apps/docs/docs/healthcheck.md` and register the id in `apps/docs/sidebars.ts`.
- Each endpoint needs a Hono route in `packages/axc/rest/src/index.ts` and a `registerAzureFunctionHttpHandler` entry in `apps/api/src/index.ts`. `host.json` `routePrefix` is empty, so register the full path.

## Layering and data access

Enforced by `pnpm run test:arch`: domain imports no other @axc package; application-services and rest never use service-mongoose; application-services may import only types from @axc/persistence.

Application services get data through ApiContext, built in `apps/api/src/index.ts` `.setContext(...)`, the same way health gets `environment`. Persistence exports the implementation; apps/api creates it and puts it in the context. Unit tests pass an in-memory instance the same way.

When you add a field to `ApiContext`, do not edit unrelated tests to satisfy it. Tests get context from one shared builder: if none exists, create `packages/axc/application-services/src/test-support/context.ts` exporting a function that returns a complete `ApiContext` with in-memory stubs and accepts a partial override, and route existing tests, including `health.test.ts`, through it. A new field is then one edit in the builder, not one per test.

## Validation

- While working: `pnpm run typecheck`; `pnpm run test:arch`; `pnpm exec turbo run test --filter=@axc/application-services`. Do not use `pnpm --filter` for tests; it skips required builds.
- Before verify: `pnpm exec biome check --write <changed paths>`. Then `pnpm run verify` once at the end.
- Send long output to a log: `mkdir -p .agents-work && <cmd> > .agents-work/<name>.log 2>&1; echo "exit $?"`, then read only the last 40 lines or grep for failures. Never read a full verify log.
- If verify fails at `pnpm audit` or Snyk, read `AGENTS.verify.md` once and follow it.

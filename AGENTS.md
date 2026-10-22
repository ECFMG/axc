# agentCourses

Start from the files below before searching.

## Write boundary

Write only `apps/api/**`, `packages/axc/domain/**`, `packages/axc/persistence/**`, `packages/axc/service-mongoose/**`, `packages/axc/application-services/**`, `packages/axc/rest/**`, `packages/axc-verification/**`, `apps/docs/**`, `.agents-work/` (gitignored scratch, logs only), and `packages/cellix/**` only to port a package (see Bans). Do not add directories under `packages/axc/`.

## Bans

Do not modify existing `packages/cellix` files; they must match upstream CellixJS. Do not port a new Cellix package unless the task cannot be done without it. Never edit `.env` or secrets. Never add or change authentication. Never edit deploy config, including `apps/api/host.json`. Do not add third-party dependencies. You may add a `workspace:*` dependency on another `@axc/*` package, then run `pnpm install` to update `pnpm-lock.yaml`. Never otherwise edit dependency fields, the lockfile, `.snyk`, or audit config. Never change biome, tsconfig, knip, vitest, cucumber, or archunit config to make a check pass. Add a biome-ignore only with a reason, matching existing ones.

## Copy the health slice

- Use case: `packages/axc/application-services/src/index.ts`, `packages/axc/application-services/src/health.test.ts`
- Route: `packages/axc/rest/src/index.ts`
- Composition: `apps/api/src/index.ts`, `apps/api/src/service-config/runtime/index.ts`
- Acceptance: `packages/axc-verification/acceptance-api/src/features/healthcheck.feature`, `packages/axc-verification/acceptance-api/src/step-definitions/healthcheck.steps.ts`
- Boot stays: `packages/axc-verification/acceptance-api/src/infrastructure.ts`
- Storage, open only if the feature stores data: `packages/axc/domain/src/index.ts`, `packages/axc/persistence/src/index.ts`, `packages/axc/service-mongoose/src/index.ts`
- Layering (enforced by pnpm run test:arch): domain imports no other @axc package; application-services and rest never use service-mongoose; application-services may import only types from @axc/persistence.

Each new endpoint needs a Hono route in `packages/axc/rest/src/index.ts` and a `registerAzureFunctionHttpHandler` entry in `apps/api/src/index.ts`. `host.json` `routePrefix` is empty, so register the full path.

## Data access

Application services get data through ApiContext, built in `apps/api/src/index.ts` `.setContext(...)`, the same way health gets `environment`. Persistence exports the implementation; apps/api creates it and puts it in the context. Unit tests pass an in-memory instance the same way.

## Cellix

Open a file under `packages/cellix/` only when a symbol imported by a slice file is not defined there. Open that module only.

## Validation

- While working: `pnpm run typecheck`; `pnpm run test:arch`; `pnpm exec turbo run test --filter=@axc/application-services`. Do not use `pnpm --filter` for tests; it skips required builds.
- Before verify: `pnpm exec biome check --write <changed paths>`.
- Once at the end: `pnpm run verify`.
- Send long output to a log: `mkdir -p .agents-work && <cmd> > .agents-work/<name>.log 2>&1; echo "exit $?"` — then read only the last 40 lines or grep for failures. Never read a full verify log.

## Docs

Add pages under `apps/docs/docs/` and register the id in `apps/docs/sidebars.ts`. Copy `apps/docs/docs/healthcheck.md`.

## Known verify failures

`verify` runs steps in order and stops at the first failure. On a clean tree every step passes except the last, Snyk, which reports a medium finding in `hono@4.13.10`. Done means verify reaches Snyk and Snyk reports only that finding. Report it as pre-existing. If verify prints Snyk: SKIPPED, treat that as done too and report it.

## Task files

Read only the task files named in your prompt. Ignore other `task-set-*.md` files, `super-prompt.md`, `evaluation-run-record.md`, and `.agents/skills/`.

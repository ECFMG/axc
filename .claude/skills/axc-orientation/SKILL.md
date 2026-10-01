---
name: axc-orientation
description: Repo map for agentCourses (axc). Read this FIRST, before any exploration — it contains what reading package.json, turbo.json, knip.json, biome.json, host.json, sidebars.ts, intro.md, healthcheck.md, the healthcheck route/service/steps, and the archunit rules would tell you. Use at the start of every task in this repo.
---

# agentCourses (axc) — orientation

Everything below is read from the repo as it stands. It replaces the dozen
file reads every session otherwise starts with; it does not replace reading a
file you are about to change.

## Layout

```
apps/api/                      composition root (Azure Functions host; routePrefix is "")
apps/docs/docs/*.md            Docusaurus docs; sidebars.ts lists doc ids: docs: ['intro', 'healthcheck']
packages/axc/domain            entities/value objects — NO hono, @azure/, mongoose, mongodb, @axc/rest,
                               @axc/persistence, @axc/service-mongoose, @axc/application-services imports
                               (test:arch greps every .ts under domain/src, tests included)
packages/axc/persistence       repository contracts, in-memory implementations
packages/axc/service-mongoose  mongoose/mongodb implementations only
packages/axc/application-services  use cases; ApplicationServices interface + factory
packages/axc/rest              Hono app; createRestApp(factory) + restHandlerCreator
packages/axc-verification/archunit-tests   dependency-rules.test.ts (layering)
packages/axc-verification/acceptance-api   Serenity/Cucumber against a real Functions host
packages/cellix/*              vendored framework — read, reuse, never edit
```

## How a request flows today (the healthcheck is the only route)

1. `apps/api/src/index.ts` — `Cellix.initializeInfrastructureServices(...)`
   `.setContext(() => ({ environment }))`
   `.initializeApplicationServices((ctx) => buildApplicationServicesFactory(ctx))`
   `.registerAzureFunctionHttpHandler('health', { route: 'health', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)`
   `.startUp()`.
   One `registerAzureFunctionHttpHandler` per route (or route pattern). `host.json`
   has `"routePrefix": ""`, so `route` is the full path after the host.
2. `packages/axc/rest/src/index.ts` — `createRestApp(applicationServicesFactory): Hono`;
   each handler does `await applicationServicesFactory.forRequest(c.req.header('Authorization'))`
   then calls a service. `restHandlerCreator` wraps it with `azureHonoHandler`.
   Query string: `c.req.query()` returns `Record<string,string>`; `c.json(body, status)`.
3. `packages/axc/application-services/src/index.ts` — `interface ApplicationServices { health: {...} }`,
   `interface ApiContext { environment }`, `buildApplicationServicesFactory(context)` returns
   `{ forRequest }`. Add a capability by extending `ApplicationServices` and the object the
   factory builds. Everything a package exposes must be reachable from its `src/index.ts`
   (knip treats `src/index.ts` as the only entry for `packages/axc/*`).

## Tests

- Unit: vitest per package. `vitest.config.ts` is 9 lines using `@cellix/config-vitest`;
  `application-services` already has one, so does `health.test.ts` as a pattern.
  Run one package: `corepack pnpm --filter @axc/application-services run test`.
- Acceptance: `packages/axc-verification/acceptance-api/src/features/*.feature` +
  `src/step-definitions/*.steps.ts`. `cucumber.yaml` already globs both — new files need no
  registration. Copy the shape of `healthcheck.steps.ts`:
  `actorCalled('API client').attemptsTo(Send.a(GetRequest.to('/path?x=y')))`,
  `Ensure.that(resolved(LastResponse.status()), equals(200))`,
  `Question.about('…', async a => (await a.answer(LastResponse.body<T>())).field)`.
  The suite boots the real Functions host on :7071 (minutes) — it is the slowest gate.
- Architecture: `archunit-tests/src/dependency-rules.test.ts` — see the domain list above.

## Docs

`apps/docs/docs/` holds `intro.md` (`slug: /`) and `healthcheck.md` (request, response JSON,
field table, curl example). A new page needs its id added to `docs: [...]` in `sidebars.ts`.

## Gates and what they cost

`pnpm run verify` = script policy → biome check . → typecheck → build → knip → e18e →
test:arch → test + test:acceptance → audit → snyk. Minutes, dominated by acceptance.
Cheap equivalents while iterating:

| need | command |
|---|---|
| format + lint one path | `corepack pnpm exec biome check --write <path>` (biome wants TABS) |
| typecheck one package | `cd packages/axc/<pkg> && ../../../node_modules/.bin/tsgo --noEmit` |
| unit tests one package | `corepack pnpm --filter @axc/<pkg> run test` |
| architecture rules only | `corepack pnpm exec turbo run test:arch --force` |

## Already available (no lockfile change needed)

`hono`, `@azure/functions`, `@marplex/hono-azurefunc-adapter` (rest); `vitest` via
`@cellix/config-vitest`; `@serenity-js/*`, `@cucumber/cucumber` (acceptance);
`@cellix/domain-seedwork`, `@cellix/mongoose-seedwork`, `mongodb-memory-server-core`
(service-mongoose). Adding a package writes `pnpm-lock.yaml`, which is outside every
task boundary.

## Do not read `.claude/`

It is harness tooling (a write-boundary guard and these skills). Nothing in it is part of
the task, and reading it costs context.

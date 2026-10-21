---
name: mog-repo-map
description: AXC map + conventions for mog-xai-1. Load first; it replaces exploring the repo, configs and arch tests. Then open only files you will change.
---

# mog-repo-map

Answers layout + rules up front. **Never** open archunit / `test:arch` internals, `packages/cellix/**` sources you won't edit,
`node_modules/`, `pnpm-lock.yaml`, `dist/`, `deploy/`, `docs/eval-contract.md`, `docs/score-metering.md`, `.husky/`,
`docs/skills-archive/`, agent memory; never list cellixjs. Batch the reads you need in one go, then write. First write by ~call 6.

## Layout

```
apps/api/src/index.ts             Cellix composition; one .registerAzureFunctionHttpHandler(name, {route, methods, authLevel}, restHandlerCreator) per route
apps/api/host.json                http.routePrefix "" → route is the full path ('api/<route>' ⇒ Hono sees /api/<route>)
apps/docs/docs/*.md + sidebars.ts Docusaurus; new page id must be in sidebars.ts docs: [...] (ids = file names)
packages/axc/domain               entities/VOs, no infra imports
packages/axc/persistence          repo contracts (+ in-memory)
packages/axc/service-mongoose     mongoose/mongodb only
packages/axc/application-services ApplicationServices + buildApplicationServicesFactory (src/index.ts); only pkg with vitest
packages/axc/rest                 Hono createRestApp + restHandlerCreator (src/index.ts)
packages/axc-verification/*       archunit-tests (rules only — don't add tests) · acceptance-api (Serenity/Cucumber)
packages/cellix/*                 vendored, reuse
```

Each package's public API = `src/index.ts`. Imports use `.ts` extensions (`./x.ts`).

## Request flow (today: healthcheck only)

1. `apps/api/src/index.ts` — infra → context → `buildApplicationServicesFactory` → `registerAzureFunctionHttpHandler('health', { route: 'health', … }, restHandlerCreator)`.
2. `packages/axc/rest/src/index.ts` — `createRestApp(factory)`: handler → `await factory.forRequest(Authorization?)` → service call. Query via `c.req.query('k')`; respond `c.json(body, status)`. The full query string reaches Hono intact.
3. `packages/axc/application-services/src/index.ts` — add the capability to `ApplicationServices` + the `forRequest` object.

## Where new code goes (passes test:arch as-is)

- Read-only feature logic/data: `application-services/src/<feature>.ts` (filter/sort/slice, seed arrays OK here). `src/index.ts` only imports + wires it. **Not** `src/contexts/` (that path triggers DataSources conventions you don't need).
- HTTP route: `rest/src/features/<feature>.ts` exporting e.g. `register<Feature>Routes(app, factory)`; `rest/src/index.ts` calls it. Only `/health` may be defined inline in `rest/src/index.ts`.
- Banned in `application-services/src/index.ts` only: `.filter(` `.sort(` `.slice(`, `fixture|seed|sample|mock… = [{` literals.
- Layering: no cycles; domain ↛ persistence/service-mongoose/application-services/rest; application-services and rest ↛ service-mongoose; no `mongoose` import in application-services.

## Facts (pre-answered — don't hunt)

- Health is inline in `application-services/src/index.ts`; there is no `contexts/`.
- **Domain imports**: none of `hono`, `@azure/`, `mongoose`, `mongodb`, `@axc/rest|persistence|service-mongoose|application-services` in `domain/src` (tests too).
- **knip** (`knip.json`): exports from non-entry files must be imported somewhere — `Unused exports` / `Unused exported types` fail verify. Don't export local-only helpers/types.
- **Hono** (`hono/dist/types/request.d.ts`): `c.req.query('k'): string | undefined` · `c.req.query(): Record<string,string>` · `c.req.queries('k'): string[] | undefined`. Prefer per-key `query('k')` (no TS4111).
- **Lockfile**: on it already — `hono`, `@azure/functions`, `@marplex/hono-azurefunc-adapter`, vitest (application-services), `@serenity-js/*`, `@cucumber/cucumber`, `@cellix/domain-seedwork`, `@cellix/mongoose-seedwork`, `mongodb-memory-server-core`. Anything else = lockfile churn.

## TypeScript (`packages/cellix/config-typescript/tsconfig.base.json`)

strict + `exactOptionalPropertyTypes` (omit the key, don't assign `undefined` to `x?:`) · `noUncheckedIndexedAccess` (`arr[i]` is `T|undefined`) ·
`noPropertyAccessFromIndexSignature` (TS4111: `rec['k']`) · `noUnusedLocals/Parameters` · `verbatimModuleSyntax` (`import type`) ·
`erasableSyntaxOnly` (no enums/namespaces/param properties) · NodeNext + `.ts` import extensions.

## Tests

- **Unit**: vitest only in `application-services` (`vitest.config.ts` = `mergeConfig(nodeConfig)` from `@cellix/config-vitest`; `test: vitest run --silent --reporter=dot`). `src/*.test.ts`, `import { describe, expect, it } from 'vitest'`. Tests elsewhere need new devDeps → lockfile churn.
- **Acceptance** (`packages/axc-verification/acceptance-api`): `cucumber.yaml` loads `src/features/**/*.feature` + `src/step-definitions/**/*.steps.ts`. `world.ts` gives actors `CallAnApi.at(<host origin>)` → relative paths `GetRequest.to('/api/<route>?k=v')`. Steps: `actorCalled('API client')`, `Send.a(...)`, `LastResponse.status()` / `.body<T>()`, `Ensure.that(resolved(q), equals(v))` — copy `step-definitions/healthcheck.steps.ts`. `Question.about(…, cb)`: `cb` not `async` unless it awaits (`useAwait`). Host port from `acceptance-port.ts`; runs only in the final gate.
- **Scenario ids**: one scenario per AC row of the task's requirements file, named id-first (`Scenario: <ID>-AC<n> …`), one id each; the evidence table reuses ids.

## Biome (`biome.json`)

Tabs, single quotes, lineWidth 230, organizeImports on. Errors that bite: `noExplicitAny`, `noNonNullAssertion` (`x!`), `useAwait`, `noEmptyBlockStatements`, `useConst`, unused vars/imports. TS4111 vs `useLiteralKeys`: keep `x['k']` + `// biome-ignore lint/complexity/useLiteralKeys: index signature` (as `acceptance-api/src/world.ts`). The final chain runs `biome check --write`.

## Iterate cheap

`nvm use` first. `pnpm exec turbo run typecheck|test --filter=<pkg> --output-logs=errors-only`. `grep -rn` (rg only if installed) → read that range. Green → go straight to `run-validation`. Output terse; success silent, errors detailed.

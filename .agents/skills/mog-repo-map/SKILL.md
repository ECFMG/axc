---
name: mog-repo-map
description: AXC map + conventions for mog-xai-1. Load first; it replaces exploring the repo, configs and arch tests. Then open only files you will change.
---

# mog-repo-map

Answers layout + rules up front. Don't explore around it: **never** open archunit / `test:arch` internals
(`packages/cellix/archunit-tests/**`, `packages/axc-verification/archunit-tests/**`), `dist/`, `deploy/`,
`docs/eval-contract.md`, `docs/score-metering.md`, `.husky/`, `docs/skills-archive/`, agent memory; never list cellixjs.
Batch the reads you need in one go, then write. First write by ~call 6.

## Layout

```
apps/api/src/index.ts             Cellix composition; .registerAzureFunctionHttpHandler(name, {route, methods, authLevel}, restHandlerCreator) per route
apps/api/host.json                http.routePrefix "" → route 'api/courses' is the full path; Hono sees /api/courses
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

## Arch rules (what `test:arch` enforces — don't open it)

- **No cycles** (apps, packages). domain ↛ persistence / service-mongoose / application-services / rest. application-services ↛ service-mongoose. rest ↛ service-mongoose.
- **Domain imports**: none of `hono`, `@azure/`, `mongoose`, `mongodb`, `@axc/rest|persistence|service-mongoose|application-services` anywhere in `domain/src` (tests too).
- **application-services `src/index.ts`** = composition only: no `.filter(` `.sort(` `.slice(` and no `fixture|seed|sample|mock… = [{` array literals → put that logic/data in a context module or behind a data source.
- **application-services `src/contexts/**`** (if you use it): non-index files contain `(dataSources: DataSources)` (curried `(dataSources: DataSources) => async (cmd) => result`); `contexts/<ctx>/<entity>/index.ts` exports `interface <X>ApplicationService`; `query-*|get-*|find-*.ts` mention `readonlyDataSource`; `create|update|delete.ts` use `withScopedTransaction`. No `mongoose` / `@cellix/mongoose-seedwork` imports.
- **rest `src/index.ts`**: no `app.get|post|…('<path>')` except `/health` → define routes in `packages/axc/rest/src/features/<x>.ts` and mount from index.

## TypeScript (`packages/cellix/config-typescript/tsconfig.base.json`)

strict + `exactOptionalPropertyTypes` (don't assign `undefined` to `x?:` — omit the key) · `noUncheckedIndexedAccess` (`arr[i]` is `T|undefined`) ·
`noPropertyAccessFromIndexSignature` (TS4111: `rec['k']`) · `noUnusedLocals/Parameters` · `verbatimModuleSyntax` (`import type`) ·
`erasableSyntaxOnly` (no enums/namespaces/param properties) · NodeNext + `.ts` import extensions.

## Tests

- **Unit**: vitest only in `application-services` (`vitest.config.ts` = `mergeConfig(nodeConfig)` from `@cellix/config-vitest`; `tsconfig.vitest.json`; `test: vitest run --silent --reporter=dot`). `src/*.test.ts`, explicit `import { describe, expect, it } from 'vitest'`. Tests elsewhere would need new devDeps → lockfile churn.
- **Acceptance** (`packages/axc-verification/acceptance-api`): `cucumber.yaml` loads `src/features/**/*.feature` + `src/step-definitions/**/*.steps.ts` (+ `serenity.ts`, `world.ts`). `world.ts` gives actors `CallAnApi.at(<host origin>)` → relative paths `GetRequest.to('/api/courses?x=1')`. Steps: `actorCalled('API client')`, `Send.a(...)`, `LastResponse.status()` / `.body<T>()`, `Ensure.that(resolved(q), equals(v))` — copy `step-definitions/healthcheck.steps.ts`. Host boots on `acceptance-port.ts` port (slow; final gate only).
- **Scenario ids**: one scenario per AC row of the task's `task-set-*-requirements.md`, named id-first (`Scenario: A-AC7 bad page → 400`), one id each; evidence table reuses ids.

## Hono (`hono/dist/types/request.d.ts`)

`c.req.query('k'): string | undefined` · `c.req.query(): Record<string,string>` · `c.req.queries('k'): string[] | undefined`. Prefer per-key `query('k')` (no TS4111). Respond `c.json(body, status)`.

## Biome (`biome.json`)

Tabs, single quotes, lineWidth 230, organizeImports on (sorted imports). Errors that bite: `noExplicitAny`, `noNonNullAssertion` (`x!`), `useAwait` (async fn without await), `noEmptyBlockStatements`, `useConst`, unused vars/imports. TS4111 vs `useLiteralKeys`: keep `x['k']` + `// biome-ignore lint/complexity/useLiteralKeys: index signature` (as `acceptance-api/src/world.ts`). `run-validation` runs `biome check --write` first.

## knip (`knip.json`)

Exports from non-entry files must be imported somewhere — `Unused exports` / `Unused exported types` fail verify. Don't export local-only helpers/types.

## TS-A catalog (only when the eval asks)

`GET /api/courses` (A1–A11, A-AC1–12): route in `apps/api` + `rest/src/features/` handler → use case behind `ApplicationServices` (logic outside app-services index) → ≥12 seeded courses (mixed modality/status/tags) → unit + one acceptance scenario per A-AC id (invalid → `400 INVALID_QUERY_PARAMETER`, empty → `200 items: []`) → docs page + `sidebars.ts` id.

## Already on the lockfile

`hono`, `@azure/functions`, `@marplex/hono-azurefunc-adapter`, vitest (application-services), `@serenity-js/*`, `@cucumber/cucumber`, `@cellix/domain-seedwork`, `@cellix/mongoose-seedwork`, `mongodb-memory-server-core`.

## Iterate cheap

`nvm use` first. `pnpm exec turbo run typecheck|test --filter=<pkg> --output-logs=errors-only`. `grep -rn` (rg only if installed) → read that range. Output terse; success silent, errors detailed.

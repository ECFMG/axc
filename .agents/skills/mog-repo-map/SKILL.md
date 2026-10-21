---
name: mog-repo-map
description: AXC map + conventions for mog-xai-1. Load first; it replaces exploring the repo, configs and arch tests. Then open only files you will change.
---

# mog-repo-map

Authoritative — don't re-verify it in source or cellixjs (cellixjs only to port a missing package). **Never** open `packages/cellix/**` sources you won't edit or anything AGENTS bans; never list cellixjs.
Read in ONE parallel batch, only what you still need: files you'll change + `acceptance-api/src/step-definitions/healthcheck.steps.ts` (step/assert API), `acceptance-api/src/questions.ts`, `application-services/src/health.test.ts` (unit pattern).

## Layout

```
apps/api/src/index.ts             Cellix composition; one .registerAzureFunctionHttpHandler(name, {route, methods, authLevel}, restHandlerCreator) per route
apps/api/host.json                http.routePrefix "" → route is the full path ('api/<route>' ⇒ Hono sees /api/<route>)
apps/docs/docs/*.md + sidebars.ts Docusaurus; new page id must be in sidebars.ts docs: [...] (ids = file names)
packages/axc/domain               entities/VOs, no infra imports
packages/axc/persistence          repo contracts (+ in-memory)
packages/axc/service-mongoose     mongoose/mongodb only
packages/axc/application-services ApplicationServices + factory (src/index.ts; health inline); only pkg with vitest
packages/axc/rest                 Hono createRestApp + restHandlerCreator (src/index.ts)
packages/axc-verification/*       archunit-tests (rules only — don't add tests) · acceptance-api (Serenity/Cucumber)
packages/cellix/*                 vendored, reuse
```

Each package's public API = `src/index.ts`. Imports use `.ts` extensions (`./x.ts`).

## Query validation (REST boundary)

- Collect every problem into `details: [{ field, message }]`, then return one 400 (code/shape per task).
- Integers: digits only → `Number.isSafeInteger` → range (huge values are 400, never `Infinity`).
- `?x=` (empty) is present and invalid, not absent.
- Enum values: the feature's exported `as const` array (flat domain constant; app-services has no `@axc/domain` dep); REST imports it, never retypes.

## Feature skeleton (passes test:arch as-is; fill `<feature>` `<Feature>` `<Thing>` `<thing>` `<ID>`)

`application-services/src/<feature>.ts` — logic + data (filter/sort/slice/seed OK here; **not** `src/contexts/`):
```ts
export const <thing>Kinds = ['a', 'b'] as const;
export type <Thing>Kind = (typeof <thing>Kinds)[number];
export interface <Thing> { id: string; kind: <Thing>Kind }
export interface <Feature>Query { kind?: <Thing>Kind; limit: number }
const <thing>s: readonly <Thing>[] = [{ id: 't1', kind: 'a' }, { id: 't2', kind: 'b' }];
export const list<Thing>s = (q: <Feature>Query): <Thing>[] => <thing>s.filter((t) => q.kind === undefined || t.kind === q.kind).slice(0, q.limit);
```
`application-services/src/index.ts` — imports + wiring only (no `.filter(` `.sort(` `.slice(` or `seed|fixture|sample|mock… = [{` here):
```ts
import { list<Thing>s, type <Feature>Query, type <Thing> } from './<feature>.ts';
export { <thing>Kinds, type <Feature>Query, type <Thing>Kind } from './<feature>.ts';
// ApplicationServices: <feature>: { list(q: <Feature>Query): <Thing>[] };   forRequest object: <feature>: { list: list<Thing>s },
```
`rest/src/features/<feature>.ts` (only `/health` stays inline in `rest/src/index.ts`):
```ts
import { type ApplicationServicesFactory, type <Feature>Query, type <Thing>Kind, <thing>Kinds } from '@axc/application-services';
import type { Hono } from 'hono';

interface Detail { field: string; message: string }
const isKind = (v: string): v is <Thing>Kind => (<thing>Kinds as readonly string[]).includes(v);
const intParam = (raw: string | undefined, field: string, [min, max, fallback]: [number, number, number], details: Detail[]): number => {
	if (raw === undefined) return fallback;
	const n = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
	if (Number.isSafeInteger(n) && n >= min && n <= max) return n;
	details.push({ field, message: `must be an integer ${min}-${max}` });
	return fallback;
};

export function register<Feature>Routes(app: Hono, factory: ApplicationServicesFactory): void {
	app.get('/api/<feature>', async (c) => {
		const details: Detail[] = [];
		const limit = intParam(c.req.query('limit'), 'limit', [1, 100, 20], details);
		const kind = c.req.query('kind');
		if (kind !== undefined && !isKind(kind)) details.push({ field: 'kind', message: `must be one of ${<thing>Kinds.join(', ')}` });
		if (details.length > 0) return c.json({ error: '<ERROR_CODE>', details }, 400);
		const query: <Feature>Query = kind !== undefined && isKind(kind) ? { limit, kind } : { limit };
		const services = await factory.forRequest(c.req.header('Authorization'));
		return c.json(services.<feature>.list(query));
	});
}
```
Mount: `rest/src/index.ts` imports `register<Feature>Routes` from `./features/<feature>.ts` and calls it before `return app`; `apps/api/src/index.ts` adds `.registerAzureFunctionHttpHandler('<feature>', { route: 'api/<feature>', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)`.

`acceptance-api/src/features/<feature>.feature` + `src/step-definitions/<feature>.steps.ts` (steps are global: define each pattern once):
```gherkin
Feature: <Feature>

  @<ID>-AC1
  Scenario: <ID>-AC1 filters by kind
    When the client requests "/api/<feature>?kind=a"
    Then the response status is 200
    And every <thing> has kind "a"

  @<ID>-AC2
  Scenario: <ID>-AC2 reports every invalid param at once
    When the client requests "/api/<feature>?limit=x&kind="
    Then the response status is 400
    And the error lists 2 details
```
```ts
import { Then, When } from '@cucumber/cucumber';
import { containItemsWhereEachItem, Ensure, equals, isGreaterThan, property } from '@serenity-js/assertions';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';
import { resolved, responseBody } from '../questions.ts';

const actor = () => actorCalled('API client');

When('the client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));
Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));
Then('every <thing> has kind {string}', (kind: string) =>
	actor().attemptsTo(Ensure.that(responseBody<{ kind: string }[]>(), property('length', isGreaterThan(0))), Ensure.that(responseBody<{ kind: string }[]>(), containItemsWhereEachItem(property('kind', equals(kind))))),
);
Then('the error lists {int} details', (n: number) => actor().attemptsTo(Ensure.that(responseBody<{ details: unknown[] }>(), property('details', property('length', equals(n))))));
```

Layering: no cycles; domain ↛ persistence/service-mongoose/application-services/rest; application-services and rest ↛ service-mongoose; no `mongoose` import in application-services.

## Facts (pre-answered — don't hunt)

- **Docs**: `apps/docs/docs/<feature>.md` — `# Title`, `## Request` (http block), `## Response`, `## Example`; add its id (= filename) to `sidebars.ts` `docs: [...]`; broken links fail the build.
- **knip** (`knip.json`): exports from non-entry files must be imported somewhere — `Unused exports` / `Unused exported types` fail verify. Don't export local-only helpers/types.
- **Lockfile**: on it already — `hono`, `@azure/functions`, `@marplex/hono-azurefunc-adapter`, vitest (application-services), `@serenity-js/*`, `@cucumber/cucumber`, `@cellix/domain-seedwork`, `@cellix/mongoose-seedwork`, `mongodb-memory-server-core`. Anything else = lockfile churn.

## TypeScript (`packages/cellix/config-typescript/tsconfig.base.json`)

strict + `exactOptionalPropertyTypes` (omit the key, don't assign `undefined` to `x?:`) · `noUncheckedIndexedAccess` (`arr[i]` is `T|undefined`) ·
`noPropertyAccessFromIndexSignature` (TS4111: `rec['k']`) · `noUnusedLocals/Parameters` · `verbatimModuleSyntax` (`import type`) ·
`erasableSyntaxOnly` (no enums/namespaces/param properties) · NodeNext + `.ts` import extensions.

## Tests

- **Assert properties**: non-empty and every result matches the filter; count/order invariants; or ids derived from the fixture in code. Never hand-picked id lists.
- **Unit**: vitest only in `application-services` (`vitest.config.ts` = `mergeConfig(nodeConfig)` from `@cellix/config-vitest`; `test: vitest run --silent --reporter=dot`). `src/*.test.ts`, `import { describe, expect, it } from 'vitest'`. Tests elsewhere need new devDeps → lockfile churn.
- **Acceptance** (`acceptance-api/src`): `features/*.feature`, `step-definitions/*.steps.ts` (global patterns), `questions.ts` (`responseBody<T>()`, `resolved()`), `world.ts` (actor `CallAnApi.at(host)`). Host: `apps/api` via `scripts/start-host.ts` on 127.0.0.1:7071 (main checkout) or 7071 + worktree offset (`acceptance-port.ts`); started and stopped per run — never start it. Relative paths only; runs only in the final gate.
- **Step API**: `@cucumber/cucumber` Given/When/Then · core `actorCalled`, `Question` · rest `Send.a(GetRequest.to(p))`, `PostRequest.to(p).with(body)`, `LastResponse.status()` · assertions `Ensure`, `equals`, `isTrue`, `isGreaterThan`, `property`, `containItemsWhereEachItem`, `containAtLeastOneItemThat`, `not`.
- **Derived check**: an async `Question.about` is `Question<Promise<T>>`, so pass it through `resolved()` (else TS2345 `Expectation<boolean>` vs `Expectation<Promise<boolean>>`):
  `const nonEmpty = Question.about('non-empty', (a) => a.answer(responseBody<T[]>()).then((xs) => xs.length > 0));` → `Ensure.that(resolved(nonEmpty), equals(true))`.
- **Scenario ids**: one scenario per AC row of the task's requirements file, named id-first (`Scenario: <ID>-AC<n> …`), one id each; the evidence table reuses ids.

## Biome (`biome.json`)

Tabs, single quotes, lineWidth 230, organizeImports on; the final chain runs `biome check --write`. Errors: `noExplicitAny`, `noNonNullAssertion` (`x!`), `noEmptyBlockStatements`, `useConst`, unused vars/imports.
- `useAwait`: no block-body `async` without `await` — return the promise or use `responseBody<T>()` (sync).

TS4111 vs `useLiteralKeys`: keep `x['k']` + `// biome-ignore lint/complexity/useLiteralKeys: index signature` (as `acceptance-api/src/world.ts`).

## Iterate cheap

`pnpm exec turbo run typecheck|test --filter=<pkg> --output-logs=errors-only`; green → `run-validation`.

# mog-repo-map

**Preloaded with this map (don't re-read): `mog-write-skeleton.md` (write endpoints), `mog-patterns.md`. Read in ONE parallel turn, nothing after: the task's requirements file (`task-set-a-requirements.md` / `task-set-b-requirements.md`, repo root) · `apps/docs/sidebars.ts` · files you'll change (`apps/api/src/index.ts`, `axc/{application-services,rest}/src/index.ts`). Write in ≤2 calls, then stop.**

**Never** open `packages/cellix/**` sources you won't edit.

## Layout

```
apps/api/src/index.ts             Cellix composition; one .registerAzureFunctionHttpHandler(name, {route, methods, authLevel}, restHandlerCreator) per route
apps/api/host.json                http.routePrefix "" → route is the full path ('api/<route>' ⇒ Hono sees /api/<route>)
apps/docs/docs/*.md + sidebars.ts Docusaurus (page ids: see Docs fact)
packages/axc/domain               entities/VOs
packages/axc/persistence          repo contracts (+ in-memory)
packages/axc/service-mongoose     mongoose/mongodb only
packages/axc/application-services ApplicationServices + factory (src/index.ts; health inline); only pkg with vitest
packages/axc/rest                 Hono createRestApp + restHandlerCreator (src/index.ts)
packages/axc-verification/*       archunit-tests (rules only — don't add tests) · acceptance-api (Serenity/Cucumber)
```

Each package's public API = `src/index.ts`: re-export from it every type/value another package imports (else TS2305/TS2459/TS2724).

## Query validation (REST boundary)

- Collect every problem (field + message) first, then return one 400. The error body is exactly the task spec's shape (names, nesting, codes) — build it in one `errorBody()`.
- Integers: digits only → `Number.isSafeInteger` → range (huge values are 400, never `Infinity`).
- `?x=` (empty) is present and invalid, not absent.
- Enum values: the feature's exported `as const` array (flat domain constant; app-services has no `@axc/domain` dep); REST imports it, never retypes.

## Feature skeleton (passes test:arch as-is; fill `<feature>` `<Feature>` `<Thing>` `<thing>` `<ID>`)

`application-services/src/<feature>.ts` — logic + data (filter/sort/slice/seed OK here; **not** `src/contexts/`):
```ts
export const <thing>Kinds = ['a', 'b'] as const;
export type <Thing>Kind = (typeof <thing>Kinds)[number];
export const is<Thing>Kind = (v: unknown): v is <Thing>Kind => (<thing>Kinds as readonly unknown[]).includes(v);
export interface <Thing> { id: string; kind: <Thing>Kind }
export interface <Feature>Query { kind?: <Thing>Kind; limit: number }
const <thing>s: readonly <Thing>[] = [{ id: 't1', kind: 'a' }, { id: 't2', kind: 'b' }];
export const list<Thing>s = (q: <Feature>Query): <Thing>[] => <thing>s.filter((t) => q.kind === undefined || t.kind === q.kind).slice(0, q.limit);
```
`application-services/src/index.ts` — imports + wiring only (no `.filter(` `.sort(` `.slice(` or `seed|fixture|sample|mock… = [{` here):
```ts
import { list<Thing>s, type <Feature>Query, type <Thing> } from './<feature>.ts';
export { is<Thing>Kind, <thing>Kinds, type <Feature>Query } from './<feature>.ts';
// ApplicationServices: <feature>: { list(q: <Feature>Query): <Thing>[] };   forRequest object: <feature>: { list: list<Thing>s },
```
`rest/src/<feature>.routes.ts` (flat file — no new folders under `packages/axc/**`; only `/health` stays inline in `rest/src/index.ts`):
```ts
import { type ApplicationServicesFactory, type <Feature>Query, is<Thing>Kind, <thing>Kinds } from '@axc/application-services';
import type { Hono } from 'hono';

interface Detail { field: string; message: string }
const errorBody = (details: Detail[]) => ({ details }); // placeholder: use the task spec's error shape
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
		if (kind !== undefined && !is<Thing>Kind(kind)) details.push({ field: 'kind', message: `must be one of ${<thing>Kinds.join(', ')}` });
		if (details.length > 0) return c.json(errorBody(details), 400);
		const query: <Feature>Query = kind !== undefined && is<Thing>Kind(kind) ? { limit, kind } : { limit };
		const services = await factory.forRequest(c.req.header('Authorization'));
		return c.json(services.<feature>.list(query));
	});
}
```
Mount: `rest/src/index.ts` imports `register<Feature>Routes` from `./<feature>.routes.ts` and calls it before `return app`; `apps/api/src/index.ts` adds `.registerAzureFunctionHttpHandler('<feature>', { route: 'api/<feature>', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)`.

`acceptance-api/src/features/<feature>.feature` + `src/step-definitions/<feature>.steps.ts`:
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

Layering (test:arch names file + fix): no cycles; domain (tests too) imports no `hono`, `@azure/`, `mongoose`, `mongodb`, other `@axc/*`; application-services and rest import no `mongoose`/`mongodb`/`@axc/service-mongoose` (rest no `@axc/persistence`); `apps/api` index wires only application-services + rest.

## Facts (pre-answered — don't hunt)

- **Routes**: one `registerAzureFunctionHttpHandler` per route template, listing every method it serves; names unique — `('<feature>', { route: 'api/<feature>', methods: ['GET', 'POST'], … })`, `('<feature>-item', { route: 'api/<feature>/{id}', methods: ['PATCH'], … })`. Azure templates use `{id}`, Hono `:id` (`c.req.param('id')`); Hono sees the full path.
- **Docs**: the path/file the task names (else `apps/docs/docs/<feature>.md`) — `# Title`, `## Request` (http block), `## Response`, `## Example`; add its id (= filename) to `sidebars.ts` `docs: [...]`; broken links fail the build.
- **knip** (`knip.json`): exports from non-entry files must be imported somewhere (a re-export from the package's `src/index.ts` counts) — `Unused exports` / `Unused exported types` fail verify. Don't `export` a type/interface/helper used only in its own file — export only what another file imports.
- **Lockfile**: on it already — `hono`, `@azure/functions`, `@marplex/hono-azurefunc-adapter`, vitest (application-services), `@serenity-js/*`, `@cucumber/cucumber`, `@cellix/domain-seedwork`, `@cellix/mongoose-seedwork`, `mongodb-memory-server-core`. Anything else = lockfile churn.

## TypeScript (`packages/cellix/config-typescript/tsconfig.base.json`)

strict + `exactOptionalPropertyTypes` (omit the key, don't assign `undefined` to `x?:`) · `noUncheckedIndexedAccess` (`arr[i]` is `T|undefined`) ·
`noPropertyAccessFromIndexSignature` (TS4111: `rec['k']`) · `noUnusedLocals/Parameters` · `verbatimModuleSyntax` (`import type`) ·
`erasableSyntaxOnly` (no enums/namespaces/param properties) · NodeNext + `.ts` import extensions.
Exported REST helpers need an explicit return type (`: Response`), else TS2883.
Narrow possibly-undefined values before use (TS18048): `if (x === undefined) …`, `?.`, `??`.

## Tests

- **Assert properties**: non-empty and every result matches the filter; count/order invariants; or ids derived from the fixture in code. Never hand-picked id lists.
- **Validation rules**: per spec validation/error rule, one boundary test + one negative test at the cheapest layer (unit first).
- **Unit**: vitest only in `application-services`. `src/*.test.ts`, `import { describe, expect, it } from 'vitest'`.
- **Acceptance** (`acceptance-api/src`): `features/*.feature`, `step-definitions/*.steps.ts`, `questions.ts`, `world.ts` (actor `CallAnApi.at(host)`). Host (`scripts/start-host.ts`, port 7071 + worktree offset) is started/stopped by the Stop hook — never start it; relative paths only.
- **Step wiring** (`acceptance-api/cucumber.yaml`): features `src/features/**/*.feature`; steps load only from `src/serenity.ts`, `src/world.ts`, `src/step-definitions/**/*.steps.ts` — name a new file `src/step-definitions/<feature>.steps.ts`, else undefined steps.
- **State persists across scenarios** (one host + one in-memory store per run): give each scenario unique data and never assume an empty store.
- **Step patterns are global** across every `.steps.ts`: reuse an existing pattern; a second definition matching the same text makes the run fail as ambiguous.
- **4xx**: `Send` doesn't throw — assert the status step, then `Ensure.that(responseBody<E>(), property('<field>', equals(v)))`.
- **Serenity imports**: static, top of file, as in `healthcheck.steps.ts` (`@serenity-js/core`, `/assertions`, `/rest`); never `await import()`.
- **Step API** beyond the skeleton: `Given`, `Question`, `PostRequest.to(p).with(body)`, `isTrue`, `containAtLeastOneItemThat`, `not`.
- **Derived check**: an async `Question.about` is `Question<Promise<T>>` — wrap it in `resolved()` (else TS2345):
  `const nonEmpty = Question.about('non-empty', (a) => a.answer(responseBody<T[]>()).then((xs) => xs.length > 0));` → `Ensure.that(resolved(nonEmpty), equals(true))`.
- **Scenario ids**: one scenario per AC row of the task's requirements file, named id-first (`Scenario: <ID>-AC<n> …`), one id each; an AC no scenario can prove (docs, process) gets a `# ac-meta: <ID>-AC<n>` line in the .feature instead. The evidence table reuses ids.

## Biome (`biome.json`)

Tabs, single quotes, lineWidth 230, organizeImports on; commit runs `biome check --write`. Errors: `noExplicitAny`, `noNonNullAssertion` (`x!`), `noEmptyBlockStatements`, `useConst`, unused vars/imports.
- `useAwait`: `async` fn with no `await` → drop `async` (return the value/Promise directly) or add a real await; steps: `responseBody<T>()` (sync).
- `useImportType`: type-only imports use `import type` / inline `type X`.

TS4111 vs `useLiteralKeys`: keep `x['k']` + `// biome-ignore lint/complexity/useLiteralKeys: index signature` (as `acceptance-api/src/world.ts`).

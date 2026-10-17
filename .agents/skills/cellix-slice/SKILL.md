---
name: cellix-slice
description: Use before adding or changing any feature in packages/axc or apps/api (new endpoint, query, command, entity, validation or error mapping). Gives the CellixJS file layout per layer, how apps/api injects data access, code skeletons, input validation rules and where each kind of test goes, so you don't need to explore /Volumes/files/src/cellixjs.
---

# Cellix vertical slice for agentCourses

Pick one bounded context name (for example `inventory`) and one entity name per aggregate, and use them in every layer. Paths below use `<context>` and `<entity>`. Follow this layout instead of flat files in `src/`. It mirrors `packages/ocom/*` in CellixJS (local checkout `/Volumes/files/src/cellixjs`, or https://github.com/CellixJs/cellixjs); open a reference file only if a decision is not covered here.

## Layout

```
packages/axc/domain/src/
  index.ts                                   export * as Domain from './domain/index.ts' (keep existing exports)
  domain/index.ts                            export * as Contexts from './contexts/index.ts'
  domain/contexts/index.ts                   export * as <Context> from './<context>/index.ts'
  domain/contexts/<context>/index.ts         export * as <Entity> from './<entity>/index.ts'
  domain/contexts/<context>/<entity>/
    <entity>.ts                              props, entity reference type, constants (allowed values) and rules
    <entity>.value-objects.ts                only when a field has its own validation rule
    <entity>.repository.ts                   write side only: extends Repository<T> from @cellix/domain-seedwork
    <entity>.uow.ts                          write side only: extends UnitOfWork / InitializedUnitOfWork
    index.ts                                 re-exports the above
packages/axc/persistence/src/
  index.ts                                   export type { DataSources, DataSourcesFactory } and the factory
  datasources/index.ts                       DataSources = { readonlyDataSource, domainDataSource? }
  datasources/readonly/index.ts              ReadonlyDataSource = { <Context>: { <Entity>: { <Entity>ReadRepo } } }
  datasources/readonly/<context>/index.ts
  datasources/readonly/<context>/<entity>/<entity>.read-repository.ts   interface + in-memory implementation
  datasources/readonly/<context>/<entity>/<entity>.data.ts              seed or fixture records
  datasources/domain/<context>/<entity>/...  write side: in-memory repository and unit of work
packages/axc/application-services/src/
  index.ts                                   ApplicationServices = { <Context>: <Context>ContextApplicationService, health }
  contexts/<context>/index.ts                <Context>(dataSources) composes entity services
  contexts/<context>/<entity>/index.ts       <Entity>ApplicationService interface + <Entity>(dataSources)
  contexts/<context>/<entity>/<operation>.ts one file per use case (query-by-x.ts, create.ts, update.ts)
packages/axc/rest/src/
  index.ts                                   createRestApp only registers routes; keep /health as is
  features/<resource>.ts                     one module per resource: parsing, validation, error mapping
```

## Composition: apps/api injects, nothing else constructs

```ts
// apps/api/src/index.ts: build the data sources once and pass them through the context
.setContext(() => ({ environment: RuntimeConfig.environment, dataSourcesFactory: Persistence() }))

// application-services/src/index.ts
export interface ApiContext { environment: HealthEnvironment; dataSourcesFactory: DataSourcesFactory }
const forRequest = async () => {
	const dataSources = context.dataSourcesFactory.withSystemPassport();
	return { health: ..., Inventory: Inventory(dataSources) };
};

// contexts/<context>/<entity>/index.ts
export interface ItemApplicationService { queryItems: (query: ItemSearchQuery) => Promise<ItemSearchResult> }
export const Item = (dataSources: DataSources): ItemApplicationService => ({ queryItems: queryItems(dataSources) });

// contexts/<context>/<entity>/query-items.ts: curried, DataSources first
export const queryItems = (dataSources: DataSources) => async (query: ItemSearchQuery) =>
	dataSources.readonlyDataSource.Inventory.Item.ItemReadRepo.search(query);
```

Rules:
- Application services import persistence **types** only (`import type { DataSources } from '@axc/persistence'`). Only `apps/api` imports persistence implementations.
- Context `index.ts` imports entity APIs with an alias and their explicit type: `import { Item as ItemApi, type ItemApplicationService } from './item/index.ts'`.
- Queries read through `readonlyDataSource`. Commands load the aggregate through the unit of work (`withScopedTransaction`), call a domain method, and save.
- Business rules (allowed values, invariants such as uniqueness, allowed state changes) live in the domain entity or the application service, not only in REST, and must hold when the service is called directly.

## Write side (commands)

- The aggregate extends `AggregateRoot<Props, Passport>` from `@cellix/domain-seedwork/aggregate-root`. Create through a static `getNewInstance(...)`, and change state through methods that enforce the rules and throw a domain error when one is broken (for example an invalid transition).
- axc has no identity or permissions yet. Define one `Passport` type in `domain/src/domain/contexts/passport.ts` (an empty interface is fine) and a system passport in persistence. Do not add permission checks.
- `<entity>.repository.ts`: `interface XRepository extends Repository<X> { getNewInstance(...); getById(id) }`. Throw `NotFoundError` from `@cellix/domain-seedwork/repository` for a missing id.
- In-memory implementations live in `persistence/src/datasources/domain/<context>/<entity>/`. Copy objects on read and write so callers can't mutate stored state, and keep the store per process.

## Validation and error contract (REST boundary)

- Parse every query or body field explicitly and collect all problems into `details: [{ field, message }]` before answering 400.
- Enumerated values come from the domain constants, never retyped lists.
- Integers: digits only, then `Number.isSafeInteger`, then the range check. Huge values like `page=99999999999999999999` must be 400, not `Infinity` or `null`.
- A parameter that is present but empty (`?filter=`) is not the same as absent. Either reject it with 400 or handle it on purpose, and test it.
- Map domain errors to the HTTP status and error code the task specifies, in one place per resource. Response bodies use the exact field names from the task.

## Tests

| Layer | Where | What |
| --- | --- | --- |
| Domain | `domain/src/domain/contexts/<context>/<entity>/*.test.ts` | rules and state transitions, including rejected ones |
| Persistence | next to the repository | filtering, paging and sorting, plus copy-on-read for in-memory stores |
| Application services | next to the operation | use cases called directly, including broken rules leaving state unchanged |
| REST | `rest/src/features/<resource>.test.ts` with `app.request(...)` | validation, status codes, error bodies |
| Acceptance | `axc-verification/acceptance-api/src/features/<capability>.feature` | one scenario per acceptance criterion, criterion id in the name (`Scenario: <criterion-id> <what it proves>`), over HTTP through the real host |

- Assert concrete results: expected ids, counts or field values. A check like `every item matches` passes on an empty list, so also assert that the list isn't empty.
- A package without Vitest copies the setup from `application-services` (`vitest.config.ts`, `tsconfig.vitest.json`, `test` script, `vitest` / `@vitest/coverage-istanbul` / `@cellix/config-vitest` dev dependencies). Domain tests must not import infrastructure, because the architecture test scans them.

## Docs

- One page per resource in `apps/docs/docs/`: path, parameters or body, success response, every error case with status and code. Add its id to `apps/docs/sidebars.ts`; ids must match file names.
- When you make an architectural choice the task doesn't dictate (for example an in-memory store instead of MongoDB), add a short decision record in `apps/docs/docs/decisions/NNNN-<title>.md` and list it in the sidebar.

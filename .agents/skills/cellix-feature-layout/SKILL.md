---
name: cellix-feature-layout
description: Folder, file, export and naming layout for business features in packages/axc (domain, persistence, service-mongoose, application-services, rest, apps/api) following the CellixJS sample application, with the ocom reference paths to read. Use when planning or adding a feature, endpoint, aggregate, repository, unit of work or application-service operation, or when a test:arch suite fails.
---

# CellixJS feature layout

Every layer groups code by bounded context and aggregate, with an `index.ts` at each folder level
re-exporting the level below. The `health` endpoint is infrastructure, not a structural example.
Reference checkout (read-only, never copied or imported): `/Volumes/files/src/CELLIX/cellixjs/packages/ocom`.
When a path below is missing there, apply the rule as written.

## domain — `packages/axc/domain/src/domain/contexts/<context>/<aggregate>/`
- `<aggregate>.aggregate.ts`: class extending `AggregateRoot` from `@cellix/domain-seedwork` (import the subpath or the `DomainSeedwork` namespace; both are accepted). Props interface and entity reference type next to it.
- `<aggregate>.value-objects.ts`: allowed values, limits and constructors; `<aggregate>.repository.ts` (repository contract) and `<aggregate>.uow.ts` (unit-of-work contract) as siblings; `features/<aggregate>.feature` + `<aggregate>.test.ts`.
- Read-only features that enforce no invariant need only the entity type and value objects; do not scaffold a root, UoW or events for them.
- Exposed from `src/index.ts` as `Domain.Contexts.<Context>.<Aggregate>.<Name>`.
- Read: `domain/src/domain/contexts/property/property/`, `domain/src/domain/contexts/value-objects.instructions.md`, `repositories.instructions.md`.

## persistence — `packages/axc/persistence/src/`
- Models: `models/<context>/<aggregate>.model.ts` exporting `<Aggregate>ModelFactory`, `<Aggregate>ModelType`, `<Aggregate>ModelName`, built with `MongooseSeedwork.modelFactory`. Read: `data-sources-mongoose-models/src/models/community/community.model.ts` (ocom keeps models in a separate package; here they live in persistence).
- Read side: `datasources/readonly/<context>/<aggregate>/<aggregate>.read-repository.ts` (+ `<aggregate>.data.ts` for the document shape), created by `get<Aggregate>ReadRepository(models)`. Methods are shaped after the question asked, return domain types, and push filtering, sorting, `skip`/`limit` and counting into MongoDB.
- Write side: `datasources/domain/<context>/<aggregate>/` with `<aggregate>.repository.ts` (extends `MongooseSeedwork.MongoRepositoryBase`), `<aggregate>.domain-adapter.ts` (`MongooseDomainAdapter` + a `MongoTypeConverter` subclass) and `<aggregate>.uow.ts` exporting `get<Aggregate>UnitOfWork = (model, passport) => new MongooseSeedwork.MongoUnitOfWork(InProcEventBusInstance, NodeEventBusInstance, model, new <Aggregate>Converter(), <Aggregate>Repository)`. Read: `persistence/src/datasources/domain/community/community/`.
- `DataSourcesFactoryImpl` composes `readonlyDataSource` and `domainDataSource`; `Persistence(initializedService)` is the package entry (`persistence/src/index.ts`). Seed data: `src/seed/<context>/<aggregate>.ts`.

## service-mongoose and the composition root
- `packages/axc/service-mongoose`: a `ServiceMongoose` implementing `ServiceBase` (`startUp`/`shutDown`) and the seedwork `MongooseContextFactory`; connects to the configured URI or starts `mongodb-memory-server-core` (binary `7.0.14`) when none is set. Read: `service-mongoose/src/index.ts` and its `features/`.
- `apps/api` registers it with `registerInfrastructureService`, seeds only without a URI, and in `setContext` builds `Persistence(service)` once and hands the data sources to `ApplicationServices`.

## application-services — `packages/axc/application-services/src/contexts/<context>/<aggregate>/`
- One file per operation (`query-by-id.ts`, `create.ts`, …) exporting `(dataSources) => async (command) => …`. Mutations run inside `domainDataSource.<Context>.<Aggregate>.<Aggregate>UnitOfWork.withScopedTransaction(async (repository) => …)`. Queries pass typed criteria to the read repository. `features/<operation>.feature` + `<operation>.test.ts` beside each. Read: `application-services/src/contexts/community/member/`.

## rest — `packages/axc/rest/src/contexts/<context>/<aggregate>/`
- Request parsing, validation, status codes, response and error bodies, with tests beside the handlers. Services receive typed input; the package root exports only what `apps/api` uses.

## Enforcement
`pnpm run test:arch` runs the vendored CellixJS convention suites per package plus this repo's
layer and feature-file rules. A failure is a structure defect: fix the code, never the suite.

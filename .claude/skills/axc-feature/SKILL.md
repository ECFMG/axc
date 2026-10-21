---
name: axc-feature
description: Cellix layout and wiring for any axc feature that adds or changes an entity, persistence, a use case, or an HTTP endpoint (domain → service-mongoose → persistence → application-services → rest → apps/api → acceptance). Load before writing feature code; it lists the file names, base classes, and wiring the architecture tests enforce, with a validated example in reference.md.
---

# axc feature in the Cellix shape

The arch suite (`packages/axc-verification/archunit-tests`) enforces this layout: the vendored Cellix convention
suites plus axc rules for layer imports, Cellix file placement, Hono↔Azure route parity, the composition root, and
requirement traceability. `reference.md` has a complete, validated slice (a `Note` aggregate in a `Notebook`
context) for every file below. Read the sections you need from it instead of exploring `packages/cellix/*`.

## Layer map (`<ctx>` = bounded context, `<agg>` = aggregate, both kebab-case)

| Layer | Files | Must |
| --- | --- | --- |
| domain | `src/domain/seedwork/{index,domain-seedwork,passport-seedwork}.ts` | Re-export seedwork subpaths as `DomainSeedwork` / `PassportSeedwork` namespaces (the vendored package has no root export; Cellix checks match `DomainSeedwork.X<`). |
| | `src/domain/contexts/passport.ts` | `Passport` interface (one entry per context) and `PassportFactory.forSystem()`. Domain permissions only; no HTTP auth. |
| | `contexts/<ctx>/<ctx>.domain-permissions.ts`, `<ctx>.visa.ts` | Visa `extends PassportSeedwork.Visa<XDomainPermissions>` and imports the permissions type. |
| | `contexts/<ctx>/<agg>/<agg>.entity.ts` | `XProps extends DomainSeedwork.DomainEntityProps`, `XEntityReference`. |
| | `<agg>.value-objects.ts` | `extends DomainSeedwork.ValueObject`; throw a domain error (with `field`) on invalid input. |
| | `<agg>.aggregate.ts` | `extends DomainSeedwork.AggregateRoot<props, Passport>`, `static getNewInstance`, imports `.entity.ts`, `Passport` from `passport.ts`, and the Visa. Member order: fields, constructor, static methods, instance accessors/methods. |
| | `<agg>.repository.ts`, `<agg>.uow.ts` | Interfaces only: `extends DomainSeedwork.Repository<...>`; UoW extends both `DomainSeedwork.UnitOfWork<` and `DomainSeedwork.InitializedUnitOfWork<` and imports Passport, entity, repository. |
| | `src/index.ts` | `export * as Domain from './domain/index.ts'` (persistence must reference `Domain.Contexts.<Ctx>.<Agg>.*`). |
| service-mongoose | `src/models/<agg>/<agg>.model.ts`, `src/models/index.ts` | Interface `extends MongooseSeedwork.Base`; export `XModelName`, `XModelFactory = MongooseSeedwork.modelFactory(...)`, `type XModelType`. `mongooseContextBuilder` + `ModelsContext`. |
| | `src/service-mongoose.ts`, `src/seed/*.seed.ts` | `ServiceMongoose implements ServiceBase<MongooseSeedwork.MongooseContextFactory>`. No connection string outside production → start `MongoMemoryReplSet` (binary `7.0.14`, cached) and seed. Never `MongoMemoryServer`: units of work need transactions, which need a replica set, on the **default** mongoose connection (`mongoose.connect`). |
| persistence | `src/datasources/domain/<ctx>/<agg>/<agg>.domain-adapter.ts` | `XDomainAdapter extends MongooseSeedwork.MongooseDomainAdapter<Model>` implementing `Domain...XProps`, plus `XConverter extends MongooseSeedwork.MongoTypeConverter<...>` in the same file. |
| | `<agg>.repository.ts`, `<agg>.uow.ts` | `extends MongooseSeedwork.MongoRepositoryBase<...> implements Domain.Contexts.<Ctx>.<Agg>.XRepository<Adapter>`; `export const getXUnitOfWork = ...` using `new MongooseSeedwork.MongoUnitOfWork(InProcEventBusInstance, NodeEventBusInstance, model, new XConverter(), XRepository)`. |
| | `src/datasources/readonly/mongo-data-source.ts`, `readonly/<ctx>/<agg>/<agg>.data.ts`, `<agg>.read-repository.ts` | Query side: `*.data.ts` `extends MongoDataSourceImpl<Model>`; read repositories filter/sort/page with Mongo queries and return read models. |
| | `src/datasources/index.ts`, `src/index.ts` | `DataSources { domainDataSource, readonlyDataSource }`, `DataSourcesFactory`, `Persistence(mongooseService)`. |
| application-services | `src/contexts/<ctx>/<agg>/<action>.ts` | Only `src/index.ts` and `src/contexts/**`. Every non-index file contains `(dataSources: DataSources) =>` and returns `async (command) => result`. `query-*/get-*/find-*` use `readonlyDataSource`; `create/update/delete.ts` use `withScopedTransaction`. No separate helper files in contexts (they fail the factory check); keep helpers inside the action file. |
| | `contexts/<ctx>/<agg>/index.ts`, `contexts/<ctx>/index.ts` | Each exports an `interface XApplicationService` / `XContextApplicationService` and its factory. `ApiContext` gains `dataSourcesFactory`; `forRequest` calls `withSystemPassport()`. |
| rest | `src/<feature>.ts`, `src/<feature>.test.ts` | Parse and validate HTTP input here (400 with every invalid field); domain invariants stay in value objects. Declare routes with full paths (`app.get('/api/things/:id', ...)`), no `.route()`/`.basePath()`. Test with `createRestApp(stubFactory).request(...)`. |
| apps/api | `src/service-config/mongoose/index.ts`, `src/index.ts` | `registerInfrastructureService(new ServiceMongoose(options))`; `setContext` builds `dataSourcesFactory: Persistence(serviceRegistry.getInfrastructureService<ServiceMongoose>(ServiceMongoose))`. Register every Hono route: `{ route: 'api/things/{id}', methods: [...], authLevel: 'anonymous' }`. Never `new` a repository or data source here. |
| acceptance-api | `src/features/<feature>.feature`, `src/step-definitions/<feature>.steps.ts` | HTTP only (`Send`, `LastResponse`, `Ensure`); no `@axc/*`/hono imports. Tag each scenario with the acceptance criteria it proves (`@A-AC3`). |

## Order of work

1. Domain context files, then `pnpm --filter @axc/domain run typecheck`.
2. Model + `ServiceMongoose` + seed in service-mongoose.
3. Persistence adapters, repository, UoW, readonly side, factory.
4. Application-services actions and indexes; unit tests with stubbed `DataSources` (see reference).
5. Rest routes + `app.request()` tests.
6. apps/api wiring; then `pnpm run verify:fast` (biome, typecheck, arch, unit).
7. Acceptance feature + steps, docs page, then `pnpm run verify`.

## Gotchas already paid for

- Dependencies: `pnpm --filter @axc/persistence add '@axc/domain@workspace:*' 'mongoose@catalog:'` (quote specs; zsh globs `*`). The lockfile change is expected. Typical adds: service-mongoose `@cellix/api-services-spec`; persistence `@axc/domain @axc/service-mongoose @cellix/mongoose-seedwork @cellix/event-bus-seedwork-node mongoose`; application-services `@axc/domain @axc/persistence`; apps/api `@axc/persistence @axc/service-mongoose`.
- rest has no test setup yet: copy `vitest.config.ts` and `tsconfig.vitest.json` verbatim from application-services (a copy, not a rules change), add devDeps `@cellix/config-vitest@workspace:* vitest@catalog: @vitest/coverage-istanbul@catalog:` and `"test": "vitest run --silent --reporter=dot"`.
- `noPropertyAccessFromIndexSignature` (tsc) and biome `useLiteralKeys` conflict on `query['page']`; destructure instead: `const { page, pageSize } = record`.
- Mongoose 8 filter type is `FilterQuery<T>`. Lean query results need a cast to the document type.
- knip fails on exports nothing imports. Export from a module only what another module uses; `src/index.ts` is the package entry.
- The existing `health.test.ts` must pass a stub `dataSourcesFactory` once `ApiContext` requires it; that is the only existing-test edit this wiring needs.
- Acceptance scenarios share one API process and database. Seeded data comes from `service-mongoose/src/seed`; scenarios that write must not break count assertions in others (assert on filters that isolate the written data).
- The arch rules ignore comments, so describe conventions freely in comments.

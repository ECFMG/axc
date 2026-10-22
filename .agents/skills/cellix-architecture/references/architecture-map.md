# Cellix Architecture Reference Map

Use the Cellix checkout and revision recorded for the run. These paths were verified against the commit in source-reference.json; they are navigation anchors, not substitutes for reading the actual source. Revalidate paths if using a different revision.

## Composition

| Pattern | Reference |
| --- | --- |
| API bootstrap and handler registration | `apps/api/src/index.ts` |
| Application-services host construction | `packages/ocom/application-services/src/index.ts` |

Expected shape: the API package wires framework, infrastructure, a data-sources factory, application services, and transport handlers. Pass the factory through context to the application-services host, as in the Cellix `apps/api/src/index.ts` and `packages/ocom/application-services/src/index.ts` pair. The host must not construct the concrete persistence adapter. The API does not implement business operations or own fixture data.

## Application Services

| Pattern | Reference |
| --- | --- |
| Context composition | `packages/ocom/application-services/src/contexts/service/index.ts` |
| Context API aliases and explicit service types | `packages/ocom/application-services/src/contexts/community/index.ts` |
| Entity application-service interface and composition | `packages/ocom/application-services/src/contexts/service/service/index.ts` |
| Curried mutation operation | `packages/ocom/application-services/src/contexts/service/service/create.ts` |
| Read-side query operation | `packages/ocom/application-services/src/contexts/user/end-user/query-by-name.ts` |

Expected shape:

- Context and entity `index.ts` files expose named service interfaces and compose operations. When a context and entity can share a name, alias the imported API (`Community as CommunityApi`) and import its explicit service type (`CommunityApplicationService`).
- Operation files receive `DataSources` before accepting their command or query.
- Each public entity operation has its own file, with its input contract declared in application services. Entity `index.ts` imports and composes operations rather than implementing them inline. Public service method types do not come from persistence, apart from the injected `DataSources` type used internally.
- Queries use `readonlyDataSource`.
- Mutations use the domain data source and scoped transactions.
- Application failures expose codes and details; REST owns the mapping to HTTP status numbers.
- The chosen context name is the same in application APIs and persistence namespaces.

## Domain

| Pattern | Reference |
| --- | --- |
| Context organization and exports | `packages/ocom/domain/src/domain/contexts/index.ts`; `packages/ocom/domain/src/domain/contexts/community/community/index.ts` |
| Aggregate and entity reference | `packages/ocom/domain/src/domain/contexts/community/community/community.ts` |
| Mutation-side repository contract | `packages/ocom/domain/src/domain/contexts/community/community/community.repository.ts` |
| Value objects and unit of work, when needed | `packages/ocom/domain/src/domain/contexts/community/community/community.value-objects.ts`; `packages/ocom/domain/src/domain/contexts/community/community/community.uow.ts` |
| Stateful workflow aggregate, props, and entity reference | `packages/ocom/domain/src/domain/contexts/case/service-ticket/v1/service-ticket-v1.aggregate.ts` |
| Stateful workflow value objects | `packages/ocom/domain/src/domain/contexts/case/service-ticket/v1/service-ticket-v1.value-objects.ts` |
| Child entities with their own lifecycle | `packages/ocom/domain/src/domain/contexts/case/service-ticket/v1/service-ticket-v1-activity-detail.entity.ts`; `packages/ocom/domain/src/domain/contexts/case/service-ticket/v1/service-ticket-v1-message.entity.ts` |
| Stateful workflow repository and unit of work | `packages/ocom/domain/src/domain/contexts/case/service-ticket/v1/service-ticket-v1.repository.ts`; `packages/ocom/domain/src/domain/contexts/case/service-ticket/v1/service-ticket-v1.uow.ts` |
| Aggregate authorization policy | `packages/ocom/domain/src/domain/contexts/case/service-ticket/v1/service-ticket-v1.visa.ts` |
| Focused aggregate and value-object tests | `packages/ocom/domain/src/domain/contexts/case/service-ticket/v1/service-ticket-v1.aggregate.test.ts`; `packages/ocom/domain/src/domain/contexts/case/service-ticket/v1/service-ticket-v1.value-objects.test.ts` |
| Search specifications | `packages/ocom/domain/src/domain/contexts/community/member/member.search-specs.ts` |

Classify the concept by domain identity and lifecycle before selecting a pattern. A persisted business object with independent identity and lifecycle, such as Course, uses an `AggregateRoot` and `*.aggregate.ts` even when the current API only reads it. Include a static `getNewInstance` factory for valid initial state, `DomainEntityProps`, an entity reference, applicable value objects, context exports, and focused tests. Stored-object reconstruction stays separate from creation. Defer mutation repository and unit-of-work contracts only when the task contains no commands; record that deferral rather than labeling the object permanently read-only. A derived projection has no independent lifecycle and needs an explicit justification. A persisted command concept with creation plus transitions, audit or history, nested lifecycle, or transactional invariants uses the full applicable stateful-workflow pattern: constrained value objects, child entities where identity or lifecycle requires them, seedwork repository and unit-of-work contracts, and focused domain tests. A public record plus free mutation functions is not an aggregate substitute. A domain `*.repository.ts` contract is for mutation-side domain access; it is not the home for a `*ReadRepository` interface.

## Persistence and Read Models

| Pattern | Reference |
| --- | --- |
| Persistence composition | `packages/ocom/persistence/src/index.ts` |
| Data-source interfaces and factory | `packages/ocom/persistence/src/datasources/index.ts` |
| Read-side data-source composition | `packages/ocom/persistence/src/datasources/readonly/index.ts` |
| Read-context composition | `packages/ocom/persistence/src/datasources/readonly/community/index.ts` |
| Read-entity composition | `packages/ocom/persistence/src/datasources/readonly/community/community/index.ts` |
| Read repository interface and implementation | `packages/ocom/persistence/src/datasources/readonly/community/community/community.read-repository.ts` |
| Read data source | `packages/ocom/persistence/src/datasources/readonly/community/community/community.data.ts` |

Expected shape: application services depend on `DataSources` and the read repository interface defined in persistence. Concrete MongoDB, in-memory, or fixture-backed implementations remain replaceable behind those contracts. Use the matching `<context>/<entity>` directories and `*.read-repository.ts` suffix for read-side code. Compose repositories through the applicable entity, context, and data-source `index.ts` files shown by the selected slice; do not centralize all concrete assembly in the root factory without a documented reason. `*.data.ts` is appropriate when a separate data-source adapter is needed; do not add empty layers solely to mirror the reference.

## Command-Side Persistence

| Pattern | Reference |
| --- | --- |
| Aggregate persistence adapter and conversion | `packages/ocom/persistence/src/datasources/domain/case/service-ticket-v1/service-ticket-v1.domain-adapter.ts` |
| Domain repository implementation | `packages/ocom/persistence/src/datasources/domain/case/service-ticket-v1/service-ticket-v1.repository.ts` |
| Unit-of-work implementation | `packages/ocom/persistence/src/datasources/domain/case/service-ticket-v1/service-ticket-v1.uow.ts` |
| Persistence composition and exports | `packages/ocom/persistence/src/datasources/domain/case/service-ticket-v1/index.ts` |
| Adapter, repository, and unit-of-work tests | `packages/ocom/persistence/src/datasources/domain/case/service-ticket-v1/*.test.ts`; `packages/ocom/persistence/src/datasources/domain/case/service-ticket-v1/features/*.feature` |

Expected shape: `service-ticket-v1.domain-adapter.ts` contains a props adapter over the stored document and a converter that constructs the aggregate from existing storage and creates an adapter for a new aggregate. The repository uses the converter in `getNewInstance` and `getById`; the Cellix repository base uses it for save. The unit-of-work factory passes the converter and repository to the transaction implementation, and entity `index.ts` exposes the initialized unit of work. Reproduce these responsibilities for an in-memory store with in-memory record types and transaction semantics; naming a map-backed store `*.domain-adapter.ts` and constructing aggregates directly from cloned records leaves the conversion boundary missing. Directly test adapter field mapping and round trips (including nested history), repository creation/retrieval/save, composition, commit, rollback, isolation or serialization, and defensive copying. Mongoose base classes, ObjectIds, event buses, and population apply only when the selected feature behavior and storage technology require them; record behavior-based omissions.

## Cross-Layer Naming Check

For every chosen context and named entity, including one currently exposed only through queries, verify that the same names appear in the domain context, application-service context, persistence context, entity modules, and data-source bindings. Inspect the analogous Cellix files before choosing exact files and exports. Check for missing applicable behavior, tests, and public types as well as matching names. A persistence-owned `Course` interface without a domain `Course` aggregate and `CourseEntityReference` is an incomplete slice.

## Transport

| Pattern | Reference |
| --- | --- |
| Thin REST handler | `packages/ocom/rest/src/index.ts` |
| Feature-oriented transport handlers | `packages/ocom/graphql-handler/src/features/**` |

This project uses Hono, so copy responsibilities rather than GraphQL syntax: keep request parsing, validation, and response mapping in a transport feature module, and delegate application behavior to application services. Treat application services as the production transport boundary. Do not import persistence contracts into transport; prefer application-service public contracts or transport-local request types. Use a domain contract directly only when the selected Cellix transport slice establishes that dependency.

## Architecture Verification

| Pattern | Reference |
| --- | --- |
| Application-service convention suite | `packages/cellix/archunit-tests/src/test-suites/application-services-conventions.ts` |
| Application-service checks | `packages/cellix/archunit-tests/src/checks/application-services-conventions.ts` |
| Dependency rules | `packages/cellix/archunit-tests/src/test-suites/dependency-rules.ts` |
| Domain conventions | `packages/cellix/archunit-tests/src/checks/domain-conventions.ts` |
| Persistence conventions | `packages/cellix/archunit-tests/src/checks/persistence-conventions.ts` |

Reuse exported checks from `@cellix/archunit-tests` where possible. Add application-specific tests only for boundaries not expressed by the reusable Cellix suite.

For behavior verification, place focused tests beside the layer that owns each rule or adapter contract and add composed public-path coverage. When a task specifies an error contract, assert its status and code together. For custom adapters, test only the reference semantics relevant to the feature and risk rather than duplicating implementation details.

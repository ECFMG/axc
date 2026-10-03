# Cellix Architecture Reference Map

The local repository at `/Volumes/files/src/cellixjs` is authoritative. These paths are navigation anchors, not substitutes for reading the current source.

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
- Queries use `readonlyDataSource`.
- Mutations use the domain data source and scoped transactions.
- The chosen context name is the same in application APIs and persistence namespaces.

## Domain

| Pattern | Reference |
| --- | --- |
| Context organization and exports | `packages/ocom/domain/src/domain/contexts/index.ts`; `packages/ocom/domain/src/domain/contexts/community/community/index.ts` |
| Aggregate and entity reference | `packages/ocom/domain/src/domain/contexts/community/community/community.ts` |
| Mutation-side repository contract | `packages/ocom/domain/src/domain/contexts/community/community/community.repository.ts` |
| Value objects and unit of work, when needed | `packages/ocom/domain/src/domain/contexts/community/community/community.value-objects.ts`; `packages/ocom/domain/src/domain/contexts/community/community/community.uow.ts` |
| Search specifications | `packages/ocom/domain/src/domain/contexts/community/member/member.search-specs.ts` |

Use the lightest applicable domain pattern. A read-only projection does not automatically require an aggregate, value objects, mutation repository, or unit of work. Place stable domain concepts in the context/entity structure when they apply. A domain `*.repository.ts` contract is for mutation-side domain access; it is not the home for a `*ReadRepository` interface.

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

Expected shape: application services depend on `DataSources` and the read repository interface defined in persistence. Concrete MongoDB, in-memory, or fixture-backed implementations remain replaceable behind those contracts. Use the matching `<context>/<entity>` directories and `*.read-repository.ts` suffix for read-side code. `*.data.ts` is appropriate when a separate data-source adapter is needed; do not add empty layers solely to mirror the reference.

## Cross-Layer Naming Check

For a chosen `Catalog` context and `Course` entity, verify that `Catalog` names the domain context, application-service context, and persistence read context, and that `Course` names the entity modules and `CourseReadRepo` binding. Inspect the analogous Cellix files before choosing exact files and exports. Check for missing applicable behavior, tests, and public types as well as matching names.

## Transport

| Pattern | Reference |
| --- | --- |
| Thin REST handler | `packages/ocom/rest/src/index.ts` |
| Feature-oriented transport handlers | `packages/ocom/graphql-handler/src/features/**` |

AgentCourses uses Hono, so copy responsibilities rather than GraphQL syntax: keep request parsing, validation, and response mapping in a transport feature module, and delegate application behavior to application services.

## Architecture Verification

| Pattern | Reference |
| --- | --- |
| Application-service convention suite | `packages/cellix/archunit-tests/src/test-suites/application-services-conventions.ts` |
| Application-service checks | `packages/cellix/archunit-tests/src/checks/application-services-conventions.ts` |
| Dependency rules | `packages/cellix/archunit-tests/src/test-suites/dependency-rules.ts` |
| Domain conventions | `packages/cellix/archunit-tests/src/checks/domain-conventions.ts` |
| Persistence conventions | `packages/cellix/archunit-tests/src/checks/persistence-conventions.ts` |

Reuse exported checks from `@cellix/archunit-tests` where possible. Add application-specific tests only for boundaries not expressed by the reusable Cellix suite.

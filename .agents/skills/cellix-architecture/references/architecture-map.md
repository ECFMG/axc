# Cellix Architecture Reference Map

The local repository at `/Volumes/files/src/cellixjs` is authoritative. These paths are navigation anchors, not substitutes for reading the current source.

## Composition

| Pattern | Reference |
| --- | --- |
| API bootstrap and handler registration | `apps/api/src/index.ts` |
| Application-services host construction | `packages/ocom/application-services/src/index.ts` |

Expected shape: the API package wires framework, infrastructure, application services, and transport handlers. It does not implement business operations or own fixture data.

## Application Services

| Pattern | Reference |
| --- | --- |
| Context composition | `packages/ocom/application-services/src/contexts/service/index.ts` |
| Entity application-service interface and composition | `packages/ocom/application-services/src/contexts/service/service/index.ts` |
| Curried mutation operation | `packages/ocom/application-services/src/contexts/service/service/create.ts` |
| Read-side query operation | `packages/ocom/application-services/src/contexts/user/end-user/query-by-name.ts` |

Expected shape:

- Context and entity `index.ts` files expose interfaces and compose operations.
- Operation files receive `DataSources` before accepting their command or query.
- Queries use `readonlyDataSource`.
- Mutations use the domain data source and scoped transactions.

## Domain

| Pattern | Reference |
| --- | --- |
| Context organization | `packages/ocom/domain/src/domain/contexts/index.ts` |
| Aggregate and entity reference | `packages/ocom/domain/src/domain/contexts/community/community/community.ts` |
| Repository contract | `packages/ocom/domain/src/domain/contexts/community/community/community.repository.ts` |
| Search specifications | `packages/ocom/domain/src/domain/contexts/community/member/member.search-specs.ts` |

Use the lightest applicable domain pattern. A read-only projection does not automatically require an aggregate, but stable business concepts and repository contracts should not be declared in transport or package composition roots.

## Persistence and Read Models

| Pattern | Reference |
| --- | --- |
| Persistence composition | `packages/ocom/persistence/src/index.ts` |
| Data-source interfaces and factory | `packages/ocom/persistence/src/datasources/index.ts` |
| Read-side data-source composition | `packages/ocom/persistence/src/datasources/readonly/index.ts` |
| Read-context composition | `packages/ocom/persistence/src/datasources/readonly/community/index.ts` |

Expected shape: application services depend on data-source contracts. Concrete MongoDB, in-memory, or fixture-backed implementations remain replaceable behind those contracts.

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


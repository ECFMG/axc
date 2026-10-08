---
name: cellix-architecture
description: Align AgentCourses implementation and review work with the local Cellix reference architecture. Use when changing or reviewing domain, application-service, persistence, REST/API composition, or architecture-test code in apps/api, packages/axc, or packages/axc-verification.
---

# Cellix Architecture Alignment

Use Cellix as an executable design reference, not merely as background documentation. Preserve the requested behavior while matching the applicable Cellix package boundaries and implementation patterns.

## Source Priority

1. `/Volumes/files/src/cellixjs`
2. <https://github.com/CellixJs/cellixjs> when the local repository is unavailable
3. Existing AgentCourses code where it already implements the same Cellix pattern

Do not modify the fixed task prompt to encode a solution. Do not copy an entire Cellix feature when only a smaller pattern is relevant.

## Workflow

### 1. Establish Constraints

- Read the applicable task requirements and allowed write boundary.
- Inspect the current AgentCourses packages and architecture tests.
- Identify existing behavior that must remain compatible.
- Check the workspace dependency edges needed by the alignment map before editing manifests. Apply the repository run workflow's boundary decision to any required root lockfile change.

### 2. Find the Nearest Cellix Vertical Slice

Search the local Cellix repository with `rg` and `rg --files`. Select concrete reference files for only the layers involved in the task.

Read [the architecture map](references/architecture-map.md) to locate common reference patterns. Inspect the actual referenced source files and their sibling and parent `index.ts`, interface, repository, and test files before making design decisions because the source repository remains authoritative. Record the applicable reference tree and the planned destination tree, including suffixes, exports, and behavior; package-level similarity alone is insufficient.

### 3. Build an Alignment Map

Before editing, record this compact map in working notes:

| Responsibility | Project destination | Cellix reference | Decision or justified deviation |
| --- | --- | --- | --- |
| API and application composition |  |  |  |
| Domain model, invariants, or mutation contract |  |  |  |
| Application operation |  |  |  |
| Read repository contract and implementation |  |  |  |
| Domain data source or repository implementation |  |  |  |
| Entity, context, data-source, and package exports |  |  |  |
| Application-facing types and errors |  |  |  |
| Transport |  |  |  |
| Tests by owning layer and composed public path |  |  |  |
| Contract documentation, when required |  |  |  |

Choose a context name before filling the map, then carry it through domain, application services, persistence, data-source namespaces, and public API types. Omit layers that the task does not need. If a simple read model does not justify a full aggregate, use the lightest Cellix-aligned abstraction and state why. List every applicable reference file, test companion, or behavior intentionally omitted, so missing pieces are deliberate rather than accidental.

### 4. Implement by Layer

- **Composition:** Wire services, data-sources factories, and handlers in `apps/api`; pass the factory through `ApiContext` to the application-services host. Keep feature logic elsewhere. The host must not construct a concrete persistence adapter itself.
- **Domain:** Put stable domain concepts, invariants, entity references, and mutation-side repository or unit-of-work contracts under `packages/axc/domain/src/domain/contexts/<context>/<entity>/` where applicable. Match the analogous Cellix `*.ts`, `*.value-objects.ts`, `*.repository.ts`, `*.uow.ts`, and `index.ts` responsibilities when the feature needs them. A read-only projection need not acquire an aggregate, mutation repository, or value objects without domain behavior.
- **Application services:** Organize context and entity APIs below `src/contexts/<context>/<entity>`. Implement operations as injected factories such as `(dataSources: DataSources) => async (query) => result`. Follow Cellix context composition: import an entity API with an alias and its explicit service type (for example, `Course as CourseApi, type CourseApplicationService`), then expose a named context service interface.
- **Queries:** Read through `readonlyDataSource` rather than owning records in the application service.
- **Mutations:** Use the domain data source and scoped transaction pattern when persistence is involved.
- **Persistence:** Put read-side repository interfaces and implementations under `packages/axc/persistence/src/datasources/readonly/<context>/<entity>/<entity>.read-repository.ts`, with applicable entity, context, and data-source `index.ts` composition and `*.data.ts` when a separate data source is needed. Keep fixtures behind that boundary. Implement mutation-side contracts under the corresponding domain data-source path. Do not place a `*ReadRepository` interface in domain; Cellix's domain `*.repository.ts` files serve a different, mutation-side role. Do not collapse applicable composition levels into the root factory merely because the resulting object has the correct shape.
- **REST:** Keep validation and HTTP error mapping at the transport boundary. Register feature routes from modules below `src/features`; do not grow the package entry point into a feature implementation. Production transport code must not import persistence contracts. Prefer application-service public contracts or transport-local request types over domain imports unless the chosen Cellix reference establishes a direct domain dependency.
- **Tests:** Test rules and operations at their owning layers, then prove public behavior through the composed HTTP acceptance path. Assert specified error status and code together. Verify material state and audit fields directly. When an in-memory or other custom adapter replaces the reference implementation, test the applicable observable semantics, such as commit, rollback, isolation, serialization, and defensive copying.
- **Documentation:** When required, account for every affected endpoint or public operation, including inputs, successful outputs, status or result, and specified errors. Derive this checklist from the task rather than adding a generic documentation burden to every change.

### 5. Review Against Cellix

Read and complete [the alignment review](references/review-template.md). Compare the planned, reference, and implemented trees as well as filename suffixes, folder depth, interfaces, exports, feature behavior, tests, context names, and dependency direction. Treat unexplained structural differences or missing applicable pieces from the chosen Cellix references as defects. Do not treat a passing functional test suite as proof of architectural alignment.

### 6. Verify

Run focused tests while implementing, then run the repository completion gate from `AGENTS.md`. Architecture-test failures must be fixed in application code; do not weaken the guardrail to make a feature pass.

Reuse the alignment map and completed review during final verification. Run shared build-dependent completion commands sequentially and avoid repeating unchanged successful checks; follow [the run workflow](../../harness-run-workflow.md) for scope and security checks. Follow the task's explicit reporting requirements.

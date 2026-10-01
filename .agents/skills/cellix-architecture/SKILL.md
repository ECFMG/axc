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

### 2. Find the Nearest Cellix Vertical Slice

Search the local Cellix repository with `rg` and `rg --files`. Select concrete reference files for only the layers involved in the task.

Read [the architecture map](references/architecture-map.md) to locate common reference patterns. Inspect the actual referenced source files before making design decisions because the source repository remains authoritative.

### 3. Build an Alignment Map

Before editing, record this compact map in working notes:

| Responsibility | AgentCourses destination | Cellix reference | Decision or justified deviation |
| --- | --- | --- | --- |
| Composition |  |  |  |
| Domain contract or model |  |  |  |
| Application operation |  |  |  |
| Data source or repository |  |  |  |
| Transport |  |  |  |
| Verification |  |  |  |

Omit layers that the task does not need. If a simple read model does not justify a full aggregate, use the lightest Cellix-aligned abstraction and state why.

### 4. Implement by Layer

- **Composition:** Wire services and handlers in `apps/api`; keep feature logic elsewhere.
- **Domain:** Put stable domain concepts, invariants, entity references, and repository contracts in `packages/axc/domain`.
- **Application services:** Organize context and entity APIs below `src/contexts`. Implement operations as injected factories such as `(dataSources: DataSources) => async (query) => result`.
- **Queries:** Read through `readonlyDataSource` rather than owning records in the application service.
- **Mutations:** Use the domain data source and scoped transaction pattern when persistence is involved.
- **Persistence:** Implement domain or read-side contracts in `packages/axc/persistence` or the applicable service adapter. Keep in-memory data behind the same boundary so it can be replaced.
- **REST:** Keep validation and HTTP error mapping at the transport boundary. Register feature routes from modules below `src/features`; do not grow the package entry point into a feature implementation.
- **Tests:** Test domain behavior and application operations at their owning layers, then prove public behavior through the composed HTTP acceptance path.

### 5. Review Against Cellix

Read and complete [the alignment review](references/review-template.md). Treat unexplained structural differences from the chosen Cellix references as defects. Do not treat a passing functional test suite as proof of architectural alignment.

### 6. Verify

Run focused tests while implementing, then run the repository completion gate from `AGENTS.md`. Architecture-test failures must be fixed in application code; do not weaken the guardrail to make a feature pass.

## Completion Evidence

Include the following in the final response:

- Cellix reference files used
- Responsibility-to-package decisions
- Any intentional deviations and their rationale
- Architecture, unit, acceptance, lint, typecheck, and build results


---
name: cellix-feature-layout
description: Folder, file, export and naming layout for business features in packages/axc (domain, persistence, application-services, rest, apps/api), following the CellixJS sample application. Use when planning or adding a feature, endpoint, aggregate, repository or application-service operation, or when an archunit convention test fails.
---

# CellixJS feature layout

New business features use the structure of the CellixJS sample application. The existing `health` endpoint is infrastructure and is not a structural example.

## Layout per layer

Group code by bounded context and aggregate in every layer, with an `index.ts` at each folder level re-exporting the level below.

- **domain**: `src/domain/contexts/<context>/<aggregate>/` holding `<aggregate>.ts` (entity type or reference) and `<aggregate>.value-objects.ts` (allowed values, limits, constructors). Expose them from `src/index.ts` as the `Domain` namespace, so callers write `Domain.Contexts.<Context>.<Aggregate>.<Name>`.
- **persistence**: read access in `src/datasources/readonly/<context>/<aggregate>/<aggregate>.read-repository.ts`, created by `get<Aggregate>ReadRepository(...)`. A `DataSources` object (`readonlyDataSource.<Context>.<Aggregate>.<Aggregate>ReadRepo`) is built by `DataSourcesFactoryImpl` and exported from the package root. Seed or fixture data lives in persistence.
- **read repositories own data access**: filtering, matching, sorting and paging happen in the repository method, so the same contract can later be backed by a database query. Shape methods after the question being asked; do not add a load-everything method that callers filter in memory.
- **application services**: one file per operation in `src/contexts/<context>/<aggregate>/` (`query-<name>.ts`, `create.ts`, ...), each exporting a function that takes `dataSources` and returns the operation. Query operations stay thin: pass typed criteria to the read repository and shape its result. The aggregate and context `index.ts` files compose these, and `ApplicationServices` exposes them as `<Context>.<Aggregate>.<operation>`.
- **rest**: request parsing, validation, status codes and response or error bodies.
- **composition root**: `apps/api` creates the data-sources factory once and passes it to the application-services factory through the API context.

## Scope of the scaffold

- Add only the contexts, aggregates, folders and files the feature uses.
- Do not scaffold unit-of-work, domain events or empty contexts for read-only features.
- Do not add value-object classes or entity base classes unless the feature mutates an aggregate or enforces invariants on it.
- Where this repository is stricter than the sample, its rules win: HTTP concerns stay in `rest`, application services receive already-typed input, and dependencies are required parameters, never optional.

## Checking a pattern against the reference

Reference checkout (read-only): `/Volumes/files/src/CELLIX/cellixjs/packages/ocom`.

- Read the matching ocom files, the `*.instructions.md` design notes under its domain contexts, and the tests next to each file.
- Do not edit the checkout, copy files from it or import from it. If the path is missing, apply the rules above on their own.
- Inside this repository, use the `typescript_lsp` tools (`lsp_find_references`, `lsp_get_definitions`) to see how an existing type or factory is wired through the layers before adding a new one.

## Enforcement

`domain`, `persistence` and `application-services` each have a `src/archunit-tests/` suite, run by `pnpm run test:arch`, that applies the vendored CellixJS convention checks to the package. A failure is a structure defect in the code: fix the code. Do not edit, skip or narrow these suites or their globs.

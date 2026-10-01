---
name: serenity-tests
description: >
  Write, review, explain, or set up AXC Serenity/JS API acceptance tests.
  Use for Cucumber Screenplay tests, @cellix/serenity-framework usage,
  acceptance-api setup, or acceptance test authoring.
---

# Serenity Tests

Use this skill when working with AXC API acceptance tests that follow the
CellixJS Serenity/JS Screenplay pattern.

Use `/Volumes/files/src/cellixjs` as the authoritative reference for these
patterns. Adapt consumer-specific names and transports to the existing AXC
implementation (REST via `@serenity-js/rest`, not GraphQL).

## Core Model

- Keep business intent in `.feature` files under
  `@axc-verification/acceptance-api` (`src/features/**/*.feature`) and map
  steps to Screenplay actors, tasks, questions, abilities, and notes.
- Reuse `@cellix/serenity-framework` for generic Serenity, Cucumber,
  infrastructure, and server-lifecycle capabilities.
- Keep AXC-specific test behavior, REST operations, test data, server
  construction, and Cucumber steps in `@axc-verification/acceptance-api`.
- Prefer actor notes for scenario-local state.
- Keep Cucumber step definitions at the acceptance-package edge rather than in
  framework packages.

## Scenario Contract

When writing or changing application behavior, create or update the Gherkin
scenario first under `@axc-verification/acceptance-api`.

Keep scenarios focused on externally observable application behavior (HTTP
status, body contract, query validation) rather than implementation details.

Use `tdd` for the outside-in development workflow.

## References

Read only the relevant reference:

- **API acceptance setup:** read `references/acceptance-api/setup.md`
- **API acceptance test writing:** read `references/acceptance-api/writing-tests.md`

Treat the reference files as AXC-oriented pattern guidance. Prefer matching the
live package under `packages/axc-verification/acceptance-api` over copying
examples from other Cellix consumers literally.

## Shared Conventions

- Use catalog versions for `@cucumber/*` and `@serenity-js/*` dependencies.
- Load TypeScript via Cucumber `requireModule: ['tsx/cjs']` (see existing
  `cucumber.yaml`).
- Give actors `CallAnApi` (or app-specific abilities built on it) pointed at the
  API origin from infrastructure state.
- Validate infrastructure state in `registerManagedSerenityWorld` before
  building the cast (API url must be present).
- Register lifecycle hooks so each scenario `init`/`cleanup`s and `AfterAll`
  stops infrastructure.

## Validation

Targeted:

```bash
pnpm --filter @axc-verification/acceptance-api test:acceptance
```

Repo-level:

```bash
pnpm run test:acceptance
```

Use `run-validation` before final handoff (`pnpm run verify`).

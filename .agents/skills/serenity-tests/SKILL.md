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
patterns.

## Core Model

- Keep business intent in `.feature` files and map steps to Screenplay actors,
  tasks, questions, abilities, and notes.
- Reuse `@cellix/serenity-framework` for generic Serenity, Cucumber,
  infrastructure, and server-lifecycle capabilities.
- Keep AXC-specific test behavior, API operations, test data, server construction,
  and Cucumber steps in `@axc-verification/acceptance-api`.
- Prefer actor notes for scenario-local state.
- Keep Cucumber step definitions at the acceptance-package edge rather than in
  framework packages.

## Scenario Contract

When writing or changing application behavior, create or update the Gherkin
scenario first under `@axc-verification/acceptance-api`.

Keep scenarios focused on externally observable application behavior rather than
implementation details.

Use `tdd` for the outside-in development workflow.

## References

Read only the relevant reference:

- **API acceptance setup:** read `references/acceptance-api/setup.md`
- **API acceptance test writing:** read `references/acceptance-api/writing-tests.md`

Treat the reference files as Cellix pattern guidance. Adapt consumer-specific
names, transports, and setup details to the existing AXC implementation rather
than taking them literally.

## Shared Conventions

- Use catalog versions for `@cucumber/*` and `@serenity-js/*` dependencies.
- Use `NODE_OPTIONS='--import tsx/esm'` for TypeScript Cucumber packages.
- Use `GherkinDataTable.from(dataTable).rowsHash<T>()` for typed Cucumber table
  input when applicable.
- Use `ActorName.resolve` when an assertion can refer to a named actor or the
  previous actor.
- Validate infrastructure state in `registerManagedSerenityWorld` before building the cast.

## Validation

Use `run-validation` for targeted and final verification.
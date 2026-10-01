---
name: serenity-tests
description: >
  Write, review, or set up API acceptance tests with Serenity/JS, Cucumber,
  Screenplay, and @cellix/serenity-framework. Use for Gherkin scenarios, step
  definitions, Tasks, Interactions, Questions, Abilities, actor notes, managed
  worlds, test infrastructure, or acceptance-suite configuration.
---

# Serenity Tests

Use this skill for API acceptance tests built with Serenity/JS and Cucumber.

Treat `@cellix/serenity-framework` as reusable test infrastructure. Keep
application-specific behavior, transport operations, test data, server
construction, and step definitions in the consumer project.

Before changing an acceptance suite, inspect its existing package manifest,
Cucumber configuration, world and infrastructure setup, and neighboring tests.
Preserve the project's established transport, runtime, module system, discovery
paths, and reporting conventions unless the task requires changing them.

## Core Model

- Express externally observable business behavior in `.feature` files
- Keep Cucumber step definitions thin and declarative
- Use Tasks for meaningful actor goals and Interactions for lower-level actions
- Use Abilities for capabilities an actor needs to interact with the system
- Use Questions to observe state for assertions
- Use actor notes for scenario-local context when appropriate, not as a
  substitute for observing the system under test
- Keep protocol and application details out of generic framework packages.

Do not introduce Screenplay abstractions solely for ceremony. Each Task,
Interaction, Question, or Ability should represent a useful responsibility or
remove meaningful duplication.

## Acceptance Boundary

Acceptance tests should exercise the application's real externally observable
boundary.

Do not substitute direct application-service, domain, or internal handler calls
for the boundary the scenario claims to verify.

When used with outside-in TDD, establish the failing acceptance behavior before
implementing the application behavior that satisfies it.

## References

Read only the relevant reference:

- **API acceptance setup:** `references/acceptance-api/setup.md`
- **API acceptance test writing:** `references/acceptance-api/writing-tests.md`
# API Acceptance Test Writing

Use this guide when writing API acceptance behavior with Cucumber and the
Serenity/JS Screenplay pattern.

## Scenarios

Write scenarios in externally observable business language.

- Describe meaningful preconditions, actor actions, and outcomes
- Avoid implementation details such as classes, repositories, database
  structure, or internal method calls
- Keep each scenario focused on behavior it can independently prove
- Include negative behavior when rejection or validation semantics are part of
  the requirement

A scenario should fail when the behavior it claims to verify is absent or
incorrect.

## Screenplay Structure

Keep Cucumber step definitions thin and declarative.

Steps should primarily:

1. resolve the actor
2. translate Gherkin input into typed test data
3. invoke Tasks or Interactions
4. ask Questions and perform assertions

Use:

- **Tasks** for meaningful actor goals
- **Interactions** for lower-level actions supporting those goals
- **Abilities** for capabilities required to interact with the system
- **Questions** for observable state used by assertions
- **Actor notes** for scenario-local context that cannot reasonably be
  re-observed.

Use Serenity/JS Interactions and Abilities appropriate to the consumer suite.

Introduce Tasks when they represent meaningful actor goals, encapsulate
multi-step behavior, or provide useful reuse. Do not require a Task wrapper
around every transport interaction.

Do not create Screenplay abstractions solely for ceremony. Each should represent
a useful responsibility, encapsulate meaningful detail, or remove meaningful
duplication.

## Observing State

Prefer observing the system through its supported boundary rather than asserting
values remembered by the test itself.

Use actor notes for context such as identifiers or correlation values needed for
later observations, not as the source of truth for behavior the system can
expose.

Fail clearly when required scenario state is missing.

## Assertions and Negative Paths

Assertions should prove the specific observable outcome described by the
scenario.

For rejected or invalid actions:

- assert the expected error, status, message, or observable result
- verify unchanged or absent success state when relevant
- distinguish the expected failure from unrelated runtime failures

Do not allow a negative scenario to pass merely because an operation threw an
exception.

## Test Boundary

Exercise the externally observable application boundary named by the scenario.

Do not replace API acceptance behavior with direct calls to application
services, repositories, domain objects, or internal transport handlers.

Keep protocol-specific operations, application test data, and step definitions
in the consumer acceptance package.

## Scenario Independence

Each scenario should be independently executable.

Do not depend on scenario ordering or state left by another scenario. Reset
mutable test state through the suite's established lifecycle.
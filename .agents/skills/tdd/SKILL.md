---
name: tdd
description: >
  Outside-in test-driven development for AXC application changes. Use when
  adding or changing application behavior.
---

# Test-Driven Development

Develop application behavior outside-in.

Use `cellix-ddd` to determine where behavior belongs.

## 1. Acceptance RED

Start with the next required application behavior.

Implement one meaningful behavior slice at a time. Do not create a single
acceptance test that represents an entire multi-behavior feature when the functionality
can be developed as smaller independently verifiable behaviors.

Write or update Serenity acceptance test(s) in
`@axc-verification/acceptance-api` that expresses that behavior through the
application boundary.

Use `serenity-tests` when implementing acceptance tests.

Run the targeted acceptance test and confirm that it fails for the expected
reason.

If it does not fail, determine whether:

- the behavior already exists; or
- the test does not actually prove the intended behavior.

Do not begin implementing the behavior until the acceptance test provides a
valid RED state.

## 2. Work Inward

Identify the affected `@axc/*` packages and components required to satisfy the
failing acceptance behavior.

For each meaningful unit of behavior, use a targeted
RED -> GREEN -> REFACTOR loop.

### RED

Write the smallest meaningful unit test for the next required behavior at its
owning layer.

Run the targeted test and confirm that it fails for the expected reason.

### GREEN

Implement the smallest Cellix-consistent change that makes the failing unit test
pass.

Do not bypass architectural boundaries or expose implementation details merely
to simplify testing.

### REFACTOR

Improve the implementation while preserving behavior and the responsibility
boundaries defined by `cellix-ddd`.

Re-run the affected unit tests.

Repeat until the components required by the acceptance behavior are implemented.

## 3. Acceptance GREEN

Re-run the original acceptance test.

It should now pass through the completed application behavior without
test-specific production changes or weakened expectations.

Tests must exercise the condition they claim to verify. Inputs, fixtures, and
assertions must demonstrate the intended behavior rather than pass vacuously.

If the acceptance expectation appears incorrect, reconcile it against the task
requirements before changing the test.

## 4. Repeat

Repeat the outside-in cycle for each distinct behavior slice:

1. Acceptance RED
2. Unit RED -> GREEN -> REFACTOR
3. Acceptance GREEN

Complete one behavior slice before moving to the next.

When implementation is complete, use `run-validation`.

## Architecture Tests

Architecture tests are repository guardrails, not part of the feature TDD loop.

Do not add or modify architecture tests unless explicitly required.
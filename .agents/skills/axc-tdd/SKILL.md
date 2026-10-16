---
name: axc-tdd
description: Test-first workflow for this repository - Gherkin feature files bound with @amiceli/vitest-cucumber, one behaviour per scenario, red before green, which layer tests what, in-memory MongoDB for repositories, Screenplay-style acceptance steps. Use before writing any test or implementation file.
---

# Test-first in packages/axc

## Loop
1. For the next requirement in your map, write `features/<name>.feature` and `<name>.test.ts` beside the code they describe (import only the signatures you need).
2. Run that file: `pnpm exec vitest run src/path/<name>.test.ts` inside the package. Confirm the failure is a missing behaviour, not a setup or import error.
3. Implement the smallest change that passes, run again, then run the package suite.
Never create a test and its implementation in the same step.

## Feature files
- One scenario per observable behaviour: exactly one `When`, one `Then` (with `And` for closely related assertions), unique titles. A scenario listing six endpoints or every validation rule at once is a defect; split it. `test:arch` rejects scenarios without `When`/`Then`, with several `When`s, or duplicate titles.
- Cover each allowed enum value, each rejection reason, boundaries and the values just outside them, defaults, and empty results — as separate scenarios.
- The `Then` must state the outcome so a reader can predict the assertion without opening the step code. A generic `Then` repeated across scenarios (`Then the HTTP contract is satisfied`, `Then the rule is enforced`, `Then the result is correct`) is Gherkin-shaped vitest, not a specification; `test:arch` fails any unparameterised `Then` used by more than 5 scenarios in a package. Either parameterise it (`Then the response status is 400 and field "pageSize" is rejected`) or write the specific outcome.

```gherkin
# Rejected: the outcome is hidden in the step code
Scenario: Page size above the maximum
  When the HTTP request is sent
  Then the HTTP contract is satisfied

# Accepted: the outcome is in the scenario
Scenario: Page size above the maximum is rejected
  When courses are requested with pageSize 51
  Then the response status is 400
  And the error names field "pageSize"
```

- Generating many scenarios from a script does not change this: each generated scenario still needs its own observable `Then`.
- Example:

```gherkin
Feature: Course lookup
  Scenario: Returns the course for a known identifier
    Given a course "intro-ts" exists
    When the course "intro-ts" is requested
    Then the course is returned with its title and status

  Scenario: Rejects a malformed identifier
    Given no course is requested yet
    When the course "not a slug!" is requested
    Then the request is rejected as "course id must be a lowercase slug"
```

```ts
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
const feature = await loadFeature('./features/query-by-id.feature');
describeFeature(feature, ({ Scenario }) => { /* bind steps */ });
```

## What each layer tests
- **domain**: invariants and value objects, in the aggregate's own test. Required whenever the domain has logic.
- **persistence**: read and write repositories against a real in-memory MongoDB (`beforeAll` start, `afterAll` stop) so filters, sorting and paging are proven by actual queries.
- **application-services**: orchestration with typed fakes of the repository or unit-of-work contract.
- **rest**: HTTP mapping and validation only; never the sole test of a behaviour.
- **acceptance** (`packages/axc-verification/acceptance-api`): one scenario per acceptance criterion, including error cases, written in Screenplay style (actor, task, question) against the running API.

## Rules
- Do not weaken or narrow a test config, skip a test, or delete a failing test to pass.
- `packages/axc-verification/archunit-tests` holds architecture rules only.
- Add `@amiceli/vitest-cucumber` as a devDependency of each package using it, matching the root's range.

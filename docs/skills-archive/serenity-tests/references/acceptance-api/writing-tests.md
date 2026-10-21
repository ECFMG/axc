# Acceptance API Test Writing

Use this guide for AXC API Cucumber Screenplay scenarios. API acceptance verifies application behavior through HTTP without a browser.

## Step Definitions

- Keep Cucumber steps thin: resolve the actor, parse tables if needed, send REST interactions, and assert on `LastResponse`.
- Prefer `@serenity-js/rest` primitives (`Send`, `GetRequest`, `PostRequest`, `LastResponse`) unless a reusable Task improves clarity.
- Store the last actor name when later steps omit an actor.
- Use typed helpers for Cucumber tables when scenarios grow beyond one-liners.

```ts
When('the client requests the healthcheck', () =>
  actor().attemptsTo(Send.a(GetRequest.to('/health'))),
);

Then('the healthcheck responds with status 200', () =>
  actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(200))),
);
```

## Tasks And Questions

- Introduce a `Task` class when an interaction is reused across steps or carries meaningful state.
- Prefer abilities for API actions when steps would otherwise embed request details repeatedly.
- Store observable scenario state in actor notes (created IDs, last error code, last query).
- Use `Question` for readable assertions over response bodies or notes.
- Fail with a diagnostic error if prerequisite state is missing.

## Validation And Negative Paths

- For invalid query/body cases, assert the HTTP status and problem contract the API actually returns (for example `400` with `INVALID_QUERY_PARAMETER` when that is the task requirement).
- Clear stale success/error notes before attempting a negative-path task when notes are used.
- Do not let negative-path scenarios pass merely because a task threw; assert the specific observable validation state.

## Boundaries

- Put AXC feature files under `packages/axc-verification/acceptance-api/src/features`.
- Put API-specific abilities, REST operations, server setup, and step definitions in `acceptance-api`.
- Stay inside the write boundary in `AGENTS.md` (`packages/axc-verification/*` is allowed).
- Do not import UI page objects or Playwright in API acceptance tests.
- Do not weaken repository verify / husky / architecture guards to make a scenario pass.

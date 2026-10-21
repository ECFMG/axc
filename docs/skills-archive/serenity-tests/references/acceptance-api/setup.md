# Acceptance API Setup

Use this guide when creating or changing the API Cucumber Screenplay suite under `@axc-verification/acceptance-api`.

## Package Shape

- Keep the package private, ESM, and TypeScript-loaded by Cucumber through `tsx/cjs` (`cucumber.yaml` `requireModule`).
- Depend on `@cellix/serenity-framework`, `@cucumber/cucumber`, `@serenity-js/core`, `@serenity-js/cucumber`, `@serenity-js/assertions`, `@serenity-js/console-reporter`, `@serenity-js/serenity-bdd`, and `@serenity-js/rest` (catalog versions).
- Put app-specific dependencies, REST client setup, persistence/seed helpers, and the process under test in the consumer package rather than the framework.
- Scripts are shaped like:

```json
{
  "test:acceptance": "rimraf target && NODE_ENV=test cucumber-js && pnpm exec serenity-bdd run --source target/site/serenity --destination target/site/serenity --features src/features"
}
```

## Cucumber Config

AXC uses `cucumber.yaml` (not a JS config export). Keep it aligned with:

```yaml
default:
  paths:
    - src/features/**/*.feature
  requireModule:
    - tsx/cjs
  require:
    - src/serenity.ts
    - src/world.ts
    - src/step-definitions/**/*.steps.ts
  format:
    - progress-bar
    - json:target/cucumber-report-api.json
    - html:target/cucumber-report-api.html
    - '@serenity-js/cucumber'
  formatOptions:
    snippetInterface: async-await
    specDirectory: src/features
  parallel: 0
```

Feature files live in this package (`src/features`), not a shared verification-shared tree, unless AXC later adds one.

## Infrastructure

- Use `ApiInfrastructure` for API suites. It starts process or in-memory servers, resets scenario state, and stops servers without launching a browser.
- Register servers in dependency order with explicit `dependsOn` metadata when needed.
- Keep server constructors app-owned. The framework should receive ready `TestServer` instances.

AXC currently boots the Azure Functions API host via `ProcessTestServer` and exposes it as `api`:

```ts
export const infrastructure = ApiInfrastructure.create({
  setupEnvironment: () => {
    /* sync local.settings as needed */
  },
})
  .addServer('api', apiServer)
  .finalize();
```

## World And Hooks

- Use `registerManagedSerenityWorld`.
- Validate that an API origin exists before creating the cast.
- Give actors REST abilities (`CallAnApi.at(origin)`), plus domain/command abilities when scenarios need them.
- Register lifecycle hooks after exporting the world type.

```ts
export const AgentCoursesApiWorld = registerManagedSerenityWorld({
  infrastructure,
  validateState: (state) => {
    if (!apiOrigin(state)) {
      throw new Error('API acceptance infrastructure did not expose an API url');
    }
  },
  createCast: (state) =>
    new SerenityCast({
      useNotepad: true,
      abilities: [() => CallAnApi.at(apiOrigin(state))],
    }),
});
```

Lifecycle hooks should call `world.init()` before each scenario, `world.cleanup()` after each scenario, and `infrastructure.stopAll()` in `AfterAll`.

## Turborepo

- Ensure `test:acceptance` participates in repo-level `pnpm run test` / `pnpm run test:acceptance`.
- Depend on `^build` when the suite needs built packages.
- Keep process-backed acceptance tasks uncached unless the suite is proven deterministic and side-effect free.

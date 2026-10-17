# agentCourses (axc): agent rules

Read this before exploring. It replaces the usual orientation reads; open only the files you will change.

## Done means

- The CI steps pass: `pnpm install --frozen-lockfile`, then `pnpm run verify`. You do not run them yourself: when you finish, a Stop hook runs both outside the sandbox (Biome, typecheck, build, Knip, e18e, architecture, unit and Serenity acceptance tests, audit, Snyk) and sends back only what failed. Fix the cause and finish again.
- Every requirement and acceptance criterion in the task is proven by a test.
- While working, use the fast checks below. They run inside the sandbox.

## Scope

- Write only inside the task's write boundary. Never edit `packages/cellix/**` (vendored), root config (`package.json`, `turbo.json`, `biome.json`, `knip.json`, `pnpm-workspace.yaml`), any `turbo.json` or tsconfig base, `.codex/`, `AGENTS.md`, CI, or `.env*`.
- Fix findings in code. Never weaken a check, test config, or ignore list.
- A dependency between workspace packages (`workspace:*`) or a dev dependency already in the catalog (`catalog:`) is fine: add it to that package's `package.json` and name it in your summary. A hook then runs `pnpm install` outside the sandbox and updates `pnpm-lock.yaml` for you. Never run `pnpm install` yourself, and never edit or revert `pnpm-lock.yaml`. No new third-party packages.
- Do not create branches, commit, or push.

## Repo map

Before adding or changing a feature, read the `cellix-slice` skill (`.agents/skills/cellix-slice/SKILL.md`): folder layout per layer, how `apps/api` injects data access, validation rules and where each test goes.

- `apps/api/src/index.ts`: composition root. One `.registerAzureFunctionHttpHandler(name, { route, methods, authLevel: 'anonymous' }, restHandlerCreator)` per route. `host.json` sets `routePrefix` to `""`, so `route` is the full path (for example `api/things`).
- `packages/axc/rest`: Hono app (`createRestApp`). HTTP parsing, validation, status codes, error bodies.
- `packages/axc/application-services`: use cases. `ApplicationServices`, `ApiContext` (what `apps/api` injects), `buildApplicationServicesFactory`.
- `packages/axc/domain`: domain model, value objects, constants. Must not import hono, `@azure/`, mongoose, mongodb or other `@axc/*` packages; the architecture test scans every file there, tests included.
- `packages/axc/persistence`: repositories and data, including in-memory fixtures.
- `packages/axc/service-mongoose`: Mongoose infrastructure only.
- Each `packages/axc/*` package exposes its API through `src/index.ts` (the Knip entry). Unused exports fail Knip.
- Unit tests sit next to the code as `src/*.test.ts`. `application-services` has the Vitest setup to copy: `vitest.config.ts`, `tsconfig.vitest.json`, the `test` script and its devDependencies.
- `packages/axc-verification/acceptance-api`: Serenity/Cucumber over HTTP against the real `apps/api` host. Add `src/features/<capability>.feature` and `src/step-definitions/<capability>.steps.ts`, following `healthcheck.*`; the existing globs pick them up. Never call Hono or application services directly here.
- `apps/docs/docs/*.md` with `apps/docs/sidebars.ts`: API docs. Sidebar ids must match file names.
- Reference architecture: CellixJS at `/Volumes/files/src/cellixjs` (or https://github.com/CellixJs/cellixjs if that path doesn't exist). Read only what the skill doesn't cover.

## Fast checks (inside the sandbox)

| Need | Command |
| --- | --- |
| Format and lint changed files | `pnpm exec biome check --write <paths>` |
| Typecheck one package and its dependencies | `pnpm exec turbo run typecheck --filter=<package>` |
| Unit tests for one package | `pnpm exec turbo run test --filter=<package>` |
| Unused files and exports | `pnpm run knip` |

Acceptance tests need the Functions host, so only the Stop hook runs them.

## Token discipline

- Locate with `rg -n` or `rg --files`, then read line ranges (`sed -n 'a,bp'`). Do not `cat` whole files or several files at once.
- Do not re-read a file you just wrote. Pipe check output through `tail -n 40`.
- No sub-agents. Keep progress notes to one line.

## Final message

- A table mapping each requirement and acceptance criterion to PASS or FAIL and the test or file that proves it.
- Commands run with their result, dependency edges added, and known limitations. Token usage and cost are measured by the operator.

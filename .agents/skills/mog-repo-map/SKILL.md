---
name: mog-repo-map
description: >
  Compact AXC repo map for mog-xai-1. Load at task start instead of dumping
  trees or blind-reading package.json / turbo / knip / biome / host / sidebars /
  healthcheck docs+route. Then open only files you will change.
---

# Skill: Mog Repo Map

One-screen map of this worktree. Replaces the usual exploration dump.
Does **not** replace reading a file you are about to edit.

## Write boundary (hard)

Allowed: `apps/api` · `apps/docs` · `packages/axc/*` · `packages/axc-verification/*` ·
port missing Cellix into `packages/cellix/**` from `/Volumes/files/src/cellixjs` only when required.

Outside boundary (do not touch): lockfile (`pnpm-lock.yaml`), unrelated apps/packages,
harness-only trees you are not asked to change.

## Package map

```
apps/api/                         Azure Functions composition root (routePrefix "")
apps/docs/docs/                   Docusaurus pages; sidebars.ts ids: intro, healthcheck
packages/axc/domain               entities/VOs — no infra imports (see traps)
packages/axc/persistence          repo contracts + in-memory
packages/axc/service-mongoose     mongoose/mongodb only
packages/axc/application-services use cases; ApplicationServices + factory
packages/axc/rest                 Hono createRestApp + restHandlerCreator
packages/axc-verification/archunit-tests     layering / domain import rules
packages/axc-verification/acceptance-api     Serenity/Cucumber vs real Functions host
packages/cellix/*                 vendored — read/reuse; edit only when porting upstream
```

## Request flow (today: healthcheck only)

1. `apps/api/src/index.ts` — Cellix infra → context → `buildApplicationServicesFactory` →
   `registerAzureFunctionHttpHandler('health', { route: 'health', ... }, restHandlerCreator)`.
   One registration per route. `host.json` `routePrefix` is `""`, so `route` is the full path.
2. `packages/axc/rest/src/index.ts` — `createRestApp(factory)`: Hono handler calls
   `factory.forRequest(Authorization?)` then a service. Query via `c.req.query()`;
   respond with `c.json(body, status)`.
3. `packages/axc/application-services/src/index.ts` — extend `ApplicationServices` +
   factory object for new capabilities. Package public surface must come through
   `src/index.ts` (knip entry).

## Docs + sidebar

- Pages live under `apps/docs/docs/` (`intro.md` slug `/`, `healthcheck.md`).
- New doc id must be added to `docs: [...]` in `apps/docs/sidebars.ts`.

## Tests (patterns to copy)

| Kind | Where | Notes |
| --- | --- | --- |
| Unit | vitest per package (`@cellix/config-vitest`) | e.g. `application-services` `health.test.ts` |
| Acceptance | `acceptance-api` `*.feature` + `*.steps.ts` | cucumber globs both; copy `healthcheck.steps.ts` shape; boots host on 7071 (main) or 7071+worktree offset (`acceptance-port.ts`; harness 10771) — slow |
| Arch | `archunit-tests` `dependency-rules.test.ts` | domain forbidden imports listed below |

Package unit: `pnpm exec turbo run test --filter=@axc/<pkg> --output-logs=errors-only`.

## Facts (pre-answered — don't hunt)

- **App-services convention** (`archunit-tests/src/application-services-conventions.test.ts` → `@cellix/archunit-tests`): checks only `application-services/src/contexts/**`. Non-index files: `(dataSources: DataSources) => async (cmd) => result`; `contexts/<ctx>/<entity>/index.ts` exports `interface *ApplicationService`; `query-*|get-*|find-*.ts` use `readonlyDataSource`; `create|update|delete.ts` use `withScopedTransaction`. Today health is inline in `src/index.ts` (no `contexts/`).
- **knip** (`knip.json`): exports from non-entry files (anything but pkg `src/index.ts`) must be imported somewhere — `Unused exports` / `Unused exported types` fail verify. Don't `export` helper types you only use locally.
- **Acceptance** (`acceptance-api/src/`): `world.ts` gives actors `CallAnApi.at(<host origin>)` → use relative paths `GetRequest.to('/api/courses?…')`. Steps: `actorCalled('API client')`, `Send.a(...)`, `LastResponse.status()/body<T>()`, `Ensure.that(resolved(...), equals(...))` — copy `step-definitions/healthcheck.steps.ts`. Host port: `acceptance-port.ts` (7071 main, +worktree offset).
- **Hono query** (`hono/dist/types/request.d.ts`): `c.req.query('k'): string | undefined`; `c.req.query(): Record<string,string>`; repeated keys `c.req.queries('k'): string[] | undefined`. Prefer `c.req.query('k')` per key (dodges TS4111).
- **TS4111 vs biome `useLiteralKeys`**: tsconfig base has `noPropertyAccessFromIndexSignature` (`cellix/config-typescript/tsconfig.base.json`) → index signatures need `x['k']`; silence biome with `// biome-ignore lint/complexity/useLiteralKeys: index signature` (as `acceptance-api/src/world.ts`). Don't disable either rule.

## Boundary traps (fail verify / SCORE)

- **Lockfile:** `pnpm add` / install rewrites root `pnpm-lock.yaml` → boundary fail. Prefer workspace deps.
- **Domain:** every `.ts` under `domain/src` (tests too) must not import `hono`, `@azure/`,
  `mongoose`, `mongodb`, `@axc/rest`, `@axc/persistence`, `@axc/service-mongoose`,
  `@axc/application-services`. DB-backed domain tests → `packages/axc-verification/**`.
- **Cellix:** vendored; no parallel reinvention.

## TS-A catalog checklist (when eval asks — do not self-run prompt)

Feature: `GET /api/courses` (A1–A11, A-AC1–12). Likely touch points:

1. Wire route in `apps/api` + Hono handler in `@axc/rest`
2. Use case on `ApplicationServices` (+ domain/persistence/mongoose as needed)
3. Seed ≥12 courses (mixed modality/status/tags)
4. Acceptance + unit coverage (success, ≥2 filter combos, pagination, sort, invalid → 400 `INVALID_QUERY_PARAMETER`, empty → 200 `items: []`)
5. Docs page + `sidebars.ts` id
6. Stay inside write boundary; finish with one `pnpm run verify`

### Scenario ids (1 criterion → 1 tagged scenario)

- Count rows in the task's `task-set-*-requirements.md` AC table; that is the scenario floor.
- Name each scenario with its id first: `Scenario: A-AC7 invalid page → 400`.
- One id per scenario; no merged ids, no untagged extras besides healthcheck.
- Before the final gate: `grep -o '[AB]-AC[0-9]*' packages/axc-verification/acceptance-api/src/features/*.feature | sort -u` must list every id.
- Evidence table rows reuse the same ids.

Contract detail: `docs/eval-contract.md`. Harness must **not** run unmodified `task-set-a-prompt.md`.

## Cheap gates

`pnpm run verify` = script policy → biome → typecheck → build → knip → e18e →
test:arch → test + acceptance → audit → snyk (minutes; acceptance dominates).

| need | command |
| --- | --- |
| lint/format path | `pnpm exec biome check <path>` (tabs) |
| unit one package | `pnpm exec turbo run test --filter=@axc/<pkg> --output-logs=errors-only` |
| full gate once (arch + acceptance live here) | `pnpm run verify > /tmp/verify.log 2>&1 \|\| node scripts/verify-excerpt.mjs /tmp/verify.log` |

Node: `.nvmrc` → 24.x. Prefix shell commands with `nvm use >/dev/null;` (source `$NVM_DIR/nvm.sh` first if `nvm` is missing) (Node 20 breaks pnpm 11).
Search: `grep -rn` (`rg -n` only if `command -v rg`).

## Already on the lockfile (no `pnpm add`)

`hono`, `@azure/functions`, `@marplex/hono-azurefunc-adapter`; vitest via `@cellix/config-vitest`;
`@serenity-js/*`, `@cucumber/cucumber`; `@cellix/domain-seedwork`, `@cellix/mongoose-seedwork`,
`mongodb-memory-server-core`.

## Skip dumping

This skill is the map — no tree walks, no bulk config reads. Never read `docs/eval-contract.md`
(Eval Runner only), `dist/`, `deploy/`; never list cellixjs. Batch reads; first write by ~call 6.
Opt-in only: `mog-critique` (fail-repair). Others parked in `docs/skills-archive/` — don't open.

## Agent-to-agent output

Structured + terse for the next agent. Success → minimal/silent. Failure → what/where/next fix.
Tools: turbo `--output-logs=errors-only` · `| tail` long output · grep -rn → line-range read · no re-read after write · no sub-agents · arch/acceptance only at final gate.
See AGENTS.md “Agent-to-agent output”.

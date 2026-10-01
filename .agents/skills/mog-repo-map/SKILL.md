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
| Acceptance | `acceptance-api` `*.feature` + `*.steps.ts` | cucumber globs both; copy `healthcheck.steps.ts` shape; boots host :7071 (slow) |
| Arch | `archunit-tests` `dependency-rules.test.ts` | domain forbidden imports listed below |

Package unit: `pnpm --filter @axc/<pkg> run test`.

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

Contract detail: `docs/eval-contract.md`. Harness must **not** run unmodified `task-set-a-prompt.md`.

## Cheap gates

`pnpm run verify` = script policy → biome → typecheck → build → knip → e18e →
test:arch → test + acceptance → audit → snyk (minutes; acceptance dominates).

| need | command |
| --- | --- |
| lint/format path | `pnpm exec biome check <path>` (tabs) |
| unit one package | `pnpm --filter @axc/<pkg> run test` |
| arch only | `pnpm run test:arch` |
| full gate once | `pnpm run verify` |

Node: `.nvmrc` → 24.x (`engines.node >=24`).

## Already on the lockfile (no `pnpm add`)

`hono`, `@azure/functions`, `@marplex/hono-azurefunc-adapter`; vitest via `@cellix/config-vitest`;
`@serenity-js/*`, `@cucumber/cucumber`; `@cellix/domain-seedwork`, `@cellix/mongoose-seedwork`,
`mongodb-memory-server-core`.

## Skip dumping

Do not tree-walk the repo or bulk-read harness config to “orient.” This skill is the map.
Open only the files your change needs. Optional skills stay off unless required
(`plan-feature`, `review-diff`, `tdd`, `serenity-tests`, `minimal-build`, `mog-critique`, `portless`, `turborepo`).

## Agent-to-agent output

Structured + terse for the next agent. Success → minimal/silent. Failure → what/where/next fix.
See AGENTS.md “Agent-to-agent output”.

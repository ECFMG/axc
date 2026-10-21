# Feature slice

Orient once, build in one pass, check the packages you changed, and stop when the named acceptance criteria pass.

## Repo card

When this file includes a repo card, that card is the map of this checkout. Do not list the repository to rebuild it. Append at most five one-line notes under "Notes added during the task" when a fact would change the next directory you open. Append the note and keep going. Do not rewrite the rest of this file, and do not paste source or the task into it.

## Orient

When a repo card is present, start from the handler, doc, and packages it names. Then read the task specification once.

When there is no card, find the closest feature of the same shape. Read only that entry point, one test next to it, its doc page if it has one, and a directory listing of the packages that own it. Then read the task specification once.

Open another file only when the card, that slice, the specification, or a compiler or test error names it. Skip generated output, dependency and vendored trees, lockfiles, and any other task specification.

An allowed path is not an instruction to use it. Use a package the slice already depends on, or one the specification cannot be met without.

## Build

Match the slice's layering, error shape, and tests. Stay inside the write boundary the task states.

When the specification says the feature must run without external services, and the slice does not already persist through a database, keep the new data in memory in a package the composition root already wires. Do not be the first caller of an unused database adapter. Do not add a dependency unless the specification cannot be met without one.

## Check

While editing, test the packages you changed. At the end, run each command the specification names, once. Do not invoke a wider audit, architecture, or security gate yourself.

If the task requires a commit and a hook runs a wider gate, let the hook run. When it fails on findings you did not introduce, record the failure and stop. Do not widen the change to clear those findings.

## Stop

Stop when every named acceptance criterion is met and those commands have been run. Do not start a dev server or a local proxy unless a criterion needs a live URL. When it does, copy the public URL style from the doc you already read.

# Repo card

File: .grok/rules/feature-slice.md
Commit: e260a2f. Map of this checkout. Not a task specification.

## Commands

`dev`, `proxy:ensure`, `test`, `test:arch`, `test:acceptance`, `typecheck`, `build`, `start`, `lint`, `format`, `format:check`, `knip`, `e18e`, `audit`, `snyk`, `verify`, `prepare`
Wide gate: `verify`. Run it only when the task names it.
Commit hook `.husky/pre-commit` runs `pnpm exec lint-staged` and `pnpm run verify`.

## Where to start

Existing HTTP handlers:
- `GET /health` in `packages/axc/rest/src/index.ts`
Docs:
- `README.md`
- `packages/axc/README.md`
- `apps/docs/docs/intro.md`
- `apps/docs/docs/healthcheck.md`

## Packages

- `@apps/api` `apps/api` — 12 files; uses @axc/application-services, @axc/rest, @cellix/api-core, @cellix/config-rolldown, @cellix/local-dev
- `@apps/docs` `apps/docs` — 9 files; uses @cellix/local-dev
- `@axc-verification/acceptance-api` `packages/axc-verification/acceptance-api` — 9 files; uses @cellix/local-dev, @cellix/serenity-framework
- `@axc-verification/archunit-tests` `packages/axc-verification/archunit-tests` — 4 files; uses @cellix/archunit-tests
- `@axc/application-services` `packages/axc/application-services` — 6 files
- `@axc/domain` `packages/axc/domain` — 3 files; uses @cellix/domain-seedwork
- `@axc/persistence` `packages/axc/persistence` — 3 files; uses @cellix/domain-seedwork
- `@axc/rest` `packages/axc/rest` — 3 files; uses @axc/application-services
- `@axc/service-mongoose` `packages/axc/service-mongoose` — 3 files; uses @cellix/mongoose-seedwork

## Large groups

- `packages/cellix` — 12 packages, 283 tracked files. @cellix/api-core, @cellix/api-services-spec, @cellix/archunit-tests, @cellix/config-rolldown, @cellix/config-typescript, @cellix/config-vitest, @cellix/domain-seedwork, @cellix/event-bus-seedwork-node, @cellix/local-dev, @cellix/mongoose-seedwork, @cellix/serenity-framework, @cellix/server-mongodb-memory-mock-seedwork
  Imported by the apps: @cellix/api-core, @cellix/config-rolldown, @cellix/local-dev.
  Open a file here only when the task or an import error names it.
Omitted from the edges above because most packages use them: @cellix/config-typescript, @cellix/config-vitest.

## Do not open

- Lockfiles: `pnpm-lock.yaml`
- Dependency and build trees: `node_modules`, `dist`, `build`, `coverage`, `target`
- `.agents/skills/`. Those skills load on their own. Do not read their reference trees.
- Repo-root task files. Open the one the user named, and a requirements file it points to. Leave the others unread: `evaluation-run-record.md`, `super-prompt.md`, `task-set-a-prompt.md`, `task-set-a-requirements.md`, `task-set-b-prompt.md`, `task-set-b-requirements.md`

## Notes added during the task

- A Hono route is not reachable until apps/api registers an Azure Functions handler for that same path, the way GET /health is registered, with authLevel: 'anonymous'. host.json sets routePrefix to an empty string.
- Package exports point at dist. Build a package before Vitest can see a new export. If dist/ disagrees with src/, trust src/.
- pnpm test does not run pnpm run test:arch.
- apps/docs markdown sits outside turbo build inputs, which list src/**. Force `@apps/docs` to rebuild after a docs change.

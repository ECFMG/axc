# AGENTS.md

General conventions for working in this repository.

## Scope
- Change only what the task requires. Do not modify, remove, or reformat unrelated code, exports, or configuration.
- Do not add new config files unless the change cannot work without them.

## Architecture
- This repo follows CellixJS layering: `packages/axc/domain` → `persistence` / `service-mongoose` → `application-services` → `rest` → `apps/api` (composition root). Dependencies point inward only.
- `packages/cellix/**` is vendored from CellixJS/cellixjs. Never modify it.
- Before adding new abstractions, look for existing ones in `packages/cellix` and `packages/axc/domain` (e.g. repository contracts, seedwork) and build on them.
- Each concept has one source of truth. Import shared types and constants from the layer that owns them rather than redefining them.

## Tests
- Unit tests live next to the code they test, in the same package (`src/*.test.ts`). Follow the setup of packages that already have tests.
- `packages/axc-verification/archunit-tests` is for architecture rules only.
- Acceptance tests go in `packages/axc-verification/acceptance-api`.
- Do not weaken or narrow existing test configs to make tests pass.

## Dependencies
- If you change any `package.json`, update `pnpm-lock.yaml` so `pnpm install --frozen-lockfile` succeeds. The lockfile update is always part of a dependency change, even when a task lists specific files to edit; you do not need to ask.
- For `workspace:*` or already-installed packages, use `pnpm install --offline` first; it needs no network access.
- The lockfile diff should contain only entries for the dependencies you changed.

## Sandbox and verification
- The sandbox has no network access. Commands that need it (`pnpm run verify`, `pnpm audit`, `pnpm run snyk`) require approval, so batch them.
- While iterating, run network-free checks directly: `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`, `pnpm run test:arch`, `pnpm run test`.
- These work inside the sandbox but Turbo tasks can run for a minute or more with little output. Keep waiting for them to finish instead of rerunning them outside the sandbox.
- Turbo cache hits are valid results. Do not rerun a task just to bypass the cache.
- Run `pnpm run verify` once, at the end. Everything must pass except the known `pnpm audit` advisories that already exist on `main` (2 critical, 3 high, 3 moderate). Do not re-audit the base branch to confirm them. Because `verify` stops at the audit step, run `pnpm run verify; pnpm run snyk` as one command so both checks need a single approval.

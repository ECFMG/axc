# AGENTS.md

General conventions for working in this repository.

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
- If you change any `package.json`, run `pnpm install` so `pnpm-lock.yaml` stays in sync. `pnpm install --frozen-lockfile` must succeed.

## Before finishing
- Run `pnpm run verify`. Everything must pass except `pnpm audit` / `snyk` findings that already exist on the base branch.

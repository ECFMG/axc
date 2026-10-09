# AGENTS.md

General conventions for working in this repository.

## Scope
- Change only what the task requires. Do not modify, remove, or reformat unrelated code, exports, or configuration.
- Do not add or change build, cache, or tooling config (e.g. `turbo.json`, tsconfig bases) unless the change cannot work without it. If you notice a pre-existing config gap, mention it in your summary instead of fixing it.

## Architecture
- This repo follows CellixJS layering: `packages/axc/domain` → `persistence` / `service-mongoose` → `application-services` → `rest` → `apps/api` (composition root). Dependencies point inward only.
- `packages/cellix/**` is vendored from CellixJS/cellixjs. Never modify it.
- Before adding new abstractions, look for existing ones in `packages/cellix` and `packages/axc/domain` (e.g. repository contracts, seedwork) and build on them.
- Each concept has one source of truth. Import shared types and constants from the layer that owns them rather than redefining them.
- HTTP concerns (request parsing, status codes, response/error bodies) belong in `rest`. Application services take typed inputs.
- Keep `index.ts` files as export barrels; put implementations and data in their own modules.

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
- Run verification once, at the end, as a single command: `pnpm run verify; pnpm run snyk`. Everything must pass except the known `pnpm audit` advisories that already exist on `main` (2 critical, 3 high, 3 moderate). Do not re-audit the base branch to confirm them.

## Adversarial review
Before final verification, get an independent review of your change. Use a sub-agent, not self-review.
- Spawn the reviewer with `fork_turns: "none"`, `model: "gpt-6.1-sol"`, `reasoning_effort: "medium"`. Give it the original task instructions verbatim, the paths of any spec files they reference, and the base commit. Do not include your own reasoning or summary of the change.
- The reviewer's brief: find defects in the uncommitted change (`git diff <base>` plus untracked files) against the task instructions, the spec, and this file. Look for unmet or misread requirements, incorrect edge-case behaviour, missing or weak tests, layering and single-source-of-truth violations, and out-of-scope changes. Report each finding with severity (blocker / major / minor), file and line, and evidence. Do not edit files or run commands that need network. Say "no blocking findings" if there are none.
- Fix blocker and major findings that are within the task's scope. Ignore style preferences and suggestions that would expand scope. If you reject a finding, record why.
- After fixing, spawn a fresh reviewer with the same brief. Stop when a review returns no blocker or major findings, or after 3 review rounds.
- In your final summary, list each round's findings and how you resolved them.

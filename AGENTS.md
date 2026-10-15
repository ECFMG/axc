# AGENTS.md

General conventions for working in this repository.

## Scope
- Change only what the task requires. Do not modify, remove, or reformat unrelated code, exports, or configuration.
- Do not add or change build, cache, or tooling config (e.g. `turbo.json`, tsconfig bases) unless the change cannot work without it. If you notice a pre-existing config gap, mention it in your summary instead of fixing it.
- When adding entries to existing JSON or config (e.g. `package.json`, tsconfig `references`), keep the existing formatting of lines you are not changing.

## Architecture
- This repo follows CellixJS layering: `packages/axc/domain` → `persistence` / `service-mongoose` → `application-services` → `rest` → `apps/api` (composition root). Dependencies point inward only.
- `packages/cellix/**` is vendored from CellixJS/cellixjs. Never modify it.
- Before adding new abstractions, look for existing ones in `packages/cellix` and `packages/axc/domain` (e.g. repository contracts, seedwork) and build on them.
- Each concept has one source of truth. Import shared types and constants from the layer that owns them rather than redefining them.
- HTTP concerns (request parsing, status codes, response/error bodies) belong in `rest`. Application services take typed inputs.
- Put new implementations and data in their own modules and export them from `index.ts`. Do not move existing code out of `index.ts` unless the task requires it.

## Tests
- Unit tests live next to the code they test, in the same package (`src/*.test.ts`). Follow the setup of packages that already have tests.
- `packages/axc-verification/archunit-tests` is for architecture rules only.
- Acceptance tests go in `packages/axc-verification/acceptance-api`. When a spec lists acceptance criteria, cover each one with at least one scenario, including error cases.
- Test logic in the layer that owns it: application-service and domain behaviour gets unit tests in that package; `rest` tests cover HTTP mapping and validation. Do not rely on `rest` tests alone.
- Never reduce test coverage to save tokens.
- Do not weaken or narrow existing test configs to make tests pass.

## Dependencies
- If you change any `package.json`, update `pnpm-lock.yaml` so `pnpm install --frozen-lockfile` succeeds. The lockfile update is always part of a dependency change, even when a task lists specific files to edit; you do not need to ask.
- For `workspace:*` or already-installed packages, use `pnpm install --offline` first; it needs no network access. `pnpm install --offline --frozen-lockfile` also works inside the sandbox.
- The lockfile diff should contain only entries for the dependencies you changed.

## Sandbox and verification
- The sandbox has no network access. Commands that need it (`pnpm run verify`, `pnpm audit`, `pnpm run snyk`) require approval, so batch them.
- While iterating, run network-free checks directly: `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`, `pnpm run test:arch`, `pnpm run test`.
- Run verification once, at the end, as a single command: `pnpm run verify; pnpm run snyk`. Everything must pass.
- If `pnpm audit` or Snyk reports an advisory introduced by your dependency changes, fix it (e.g. upgrade or pin a patched version). If an advisory already exists on the base commit and fixing it needs files outside the task's write boundary (e.g. `pnpm-workspace.yaml` overrides), do not fix it; list it in your summary with the patched version. Report Snyk authentication or organization errors instead of working around them.

## Messages
These rules apply only to what you write to the user. They do not limit how much you read, explore, or test.
- Keep progress updates to one short line. Do not narrate plans or restate code you are about to write.
- Keep the final summary concise: include what the task asks you to report, without repeating file contents or full command output.

## Adversarial review
Before final verification, get an independent review of your change. Use a sub-agent, not self-review.
- Spawn the reviewer with `fork_turns: "none"`, `model: "gpt-6.1-sol"`, `reasoning_effort: "medium"`. Give it the original task instructions verbatim, the paths of any spec files they reference, and the base commit. Do not include your own reasoning or summary of the change.
- The reviewer's brief: find defects in the uncommitted change (`git diff <base>` plus untracked files) against the task instructions, the spec, and this file. Look for unmet or misread requirements, incorrect edge-case behaviour, missing or weak tests, layering and single-source-of-truth violations, and out-of-scope changes. Report each finding with severity (blocker / major / minor), file and line, and evidence. Do not edit files or run commands that need network. Say "no blocking findings" if there are none. Report findings only, without restating the change.
- Fix blocker and major findings that are within the task's scope. Ignore style preferences and suggestions that would expand scope. If you reject a finding, record why.
- After fixing, spawn a fresh reviewer with the same brief. Stop when a review returns no blocker or major findings, or after 3 review rounds.
- In your final summary, list each round's findings and how you resolved them.

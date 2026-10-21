# AXC agents (mog-xai-1)

CellixJS architecture; `/Volumes/files/src/cellixjs` only to port a missing package (never list).

## Territory

Branch `mog-xai-1`. Local commits only — no push/PR. Don't drive `mog-xai-1-a-out*`; don't run `task-set-*-prompt.md` yourself.

## Write boundary

Write only `apps/api` · `apps/docs` · `packages/axc/*` · `packages/axc-verification/*` · `packages/cellix/**` (port missing CellixJS capability only). Never weaken verify/husky/arch tests; never `--no-verify`.

Traps:
- `pnpm-lock.yaml` is outside: no `pnpm add`/`install <pkg>`; adding a dep to any package.json churns it.
- `packages/axc/domain/src/**` (tests too) must not import `hono`, `@azure/`, `mongoose`, `mongodb`, `@axc/rest|persistence|service-mongoose|application-services`.
- `packages/cellix/**` is vendored: reuse, don't fork.

## SCORE path

1. Load `mog-repo-map` — authoritative; don't re-verify it in source or cellixjs. Aim ≤3 read calls (guideline), then write all files in one pass.
2. Typecheck/test green → run the `run-validation` chain at once (no diff/status/re-read review), foreground, long timeout; husky verify is the single gate.
3. Never read: `pnpm-lock.yaml`, `node_modules/`, `docs/eval-contract.md`, `docs/score-metering.md`, `.husky/`, archunit/`test:arch` internals, `dist/`, `deploy/`, `docs/skills-archive/`, agent memory. Never write memory.
4. Fail-repair or harness prep only: open `docs/mog-critique.md` by path (3–10 rounds, stop when clean).

## Output (token budget)

- No preamble, plans or narration between tool calls; don't restate files you wrote. Success silent; errors = what/where/next fix. Never paste diffs, files or green logs.
- Shell: `nvm use` first (Node 24; Node 20 breaks pnpm 11). turbo `--output-logs=errors-only`; long output `| tail -n 40`.
- Search `grep -rn` (rg only if installed) → read that line range; never cat whole files. No re-reading what you wrote. Batch edits into as few calls as possible. No sub-agents.
- Arch + acceptance only in the final gate.

## Finish

One line: `<sha> verify ok · acceptance N/N` (or the failure). Evidence table only if the task prompt asks for one.

## Eval operators

After SCORE paste `/usage` into `evaluation-run-record.md` (map `docs/score-metering.md`); never invent numbers. Dev: `pnpm run dev` / `pnpm run dev:worktree`.

# AXC agents (mog-xai-1)

CellixJS architecture; reference `/Volumes/files/src/cellixjs` (targeted reads only, never list).

## Territory

Branch `mog-xai-1`. Local commits only — no push/PR. Don't drive `mog-xai-1-a-out*`; don't run `task-set-*-prompt.md` yourself.

## Write boundary

Write only `apps/api` · `apps/docs` · `packages/axc/*` · `packages/axc-verification/*` · `packages/cellix/**` (port missing CellixJS capability only). Never weaken verify/husky/arch tests; never `--no-verify`.

Traps:
- `pnpm-lock.yaml` is outside: no `pnpm add`/`install <pkg>`; adding a dep to any package.json churns it.
- `packages/axc/domain/src/**` (tests too) must not import `hono`, `@azure/`, `mongoose`, `mongodb`, `@axc/rest|persistence|service-mongoose|application-services`.
- `packages/cellix/**` is vendored: reuse, don't fork.

## SCORE path

1. Load `mog-repo-map` → it answers layout/conventions. Batch the reads you need once, then write; first write by ~call 6.
2. Typecheck/test green → run the `run-validation` chain at once (no diff/status/re-read review), foreground, long timeout; husky verify is the single gate.
3. Never read: `pnpm-lock.yaml`, `node_modules/`, `docs/eval-contract.md`, `docs/score-metering.md`, `.husky/`, archunit/`test:arch` internals, `dist/`, `deploy/`, `docs/skills-archive/`, agent memory. Never write memory.
4. Fail-repair or harness prep only: open `docs/mog-critique.md` by path (3–10 rounds, stop when clean).

## Output (token budget)

- Terse, structured; no preamble/narration. Success silent; errors = what/where/next fix. Never paste diffs, files or green logs.
- Shell: `nvm use` first (Node 24; Node 20 breaks pnpm 11). turbo `--output-logs=errors-only`; long output `| tail -n 40`.
- Search `grep -rn` (rg only if installed) → read that line range. No re-reading what you wrote. No sub-agents.
- Arch + acceptance only in the final gate.

## Finish

Evidence table: one row per requirement/AC id → PASS/FAIL + proving test/file.

## Eval operators

After SCORE paste `/usage` into `evaluation-run-record.md` (map `docs/score-metering.md`); never invent numbers. Dev: `pnpm run dev` / `pnpm run dev:worktree`.

# AXC agents (mog-xai-1)

**≤2 orientation rounds: every read in ONE parallel turn, only what `mog-repo-map` points to. Write all files in ≤2 calls (one batch + one optional fix-up). Then stop — the Stop hook installs, verifies and commits.**

CellixJS architecture; `/Volumes/files/src/cellixjs` only to port a missing package (never list).

## Territory

Branch `mog-xai-1`. Local commits only — no push/PR. Don't drive `mog-xai-1-a-out*`; don't run `task-set-*-prompt.md` yourself.

## Write boundary

Write only `apps/api` · `apps/docs` · `packages/axc/*` · `packages/axc-verification/*` · `packages/cellix/**` (port missing CellixJS capability only). Never weaken verify/husky/arch tests; never `--no-verify`.

Traps:
- `pnpm-lock.yaml` is outside: no `pnpm add`/`install <pkg>`; adding a dep to any package.json churns it.
- `packages/cellix/**` is vendored: reuse, don't fork.

## Feature recipe (SCORE)

Shell: `nvm use` first (Node 24). No narration, plans or sub-agents; success silent, errors = what/where/next fix.

1. Read `mog-repo-map` (authoritative — don't re-verify in source/cellixjs); then only targeted `grep -rn` / line ranges (nothing >~2KB); map + skeletons replace package.json, ADRs, intro docs.
2. Write: wiring file <~30 lines → whole rewrite, imports on top; larger → targeted edits.
3. Stop. Never run verify, `test:arch`, acceptance or `git commit` yourself — a blocked stop lists the problems; fix, stop again. No Stop hook in your tool: `node scripts/stop-gate.mjs run` once at the end.

Never read: `pnpm-lock.yaml`, `node_modules/`, `dist/`, `deploy/`, `.husky/`, archunit/`test:arch` internals, `docs/skills-archive/`, agent memory (never write it). Never read or edit `evaluation-run-record.md` or eval/score docs (`docs/eval-contract.md`, `docs/score-metering.md`, `docs/harness-cost-usage.md`) — the operator fills them.

Fail-repair or harness prep only: `docs/mog-critique.md` by path (3–10 rounds, stop when clean). Evidence table only if the task prompt asks.

Dev: `pnpm run dev` / `pnpm run dev:worktree`.

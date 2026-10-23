# AXC agents (mog-xai-1)

**ONE orientation round: every read in one parallel turn — `mog-repo-map` + the list atop it, nothing after. Write all files in ≤2 calls (one batch + one optional fix-up). Then stop.**

CellixJS architecture; `/Volumes/files/src/cellixjs` only to port a missing package (never list).

## Territory

Local commits only — no push/PR. Don't drive other `mog-xai-1-*` worktrees or run `task-set-*-prompt.md`.

## Write boundary

Write only `apps/api` · `apps/docs` · `packages/axc/*` · `packages/axc-verification/*` · `packages/cellix/**` (port missing CellixJS capability only). Never weaken verify/husky/arch tests; never `--no-verify`.

Traps:
- `pnpm-lock.yaml` is outside: no `pnpm add`/`install <pkg>`; adding a dep to any package.json churns it.
- `packages/cellix/**` is vendored: reuse, don't fork.

## Feature recipe (SCORE)

Shell: `nvm use` first (Node 24). No narration, plans or sub-agents; success silent, errors = what/where/next fix.

1. Read `mog-repo-map` (authoritative — don't re-verify in source/cellixjs) and its list in one turn; nothing >~2KB.
2. Write: wiring file <~30 lines → whole rewrite, imports on top; larger → targeted edits.
3. Stop. Tool with a Stop hook (e.g. Grok, Claude Code): just stop — it auto-fixes, verifies, lists the rest; fix, stop again. Only a tool with no Stop hook: `node scripts/stop-gate.mjs run` once at the end. Never run vitest, biome, knip, typecheck, verify, `test:arch` or `git commit` yourself.

Never read (the map answers them): `knip.json`, `package.json`, existing docs pages and `.feature` files, ADRs, intro docs; `pnpm-lock.yaml`, `node_modules/`, `dist/`, `deploy/`, `.husky/`, archunit/`test:arch` internals, `docs/skills-archive/`, agent memory (never write it). Never read or edit `evaluation-run-record.md`, `docs/eval-contract.md`, `docs/score-metering.md`, `docs/harness-cost-usage.md` (operator-owned).

Fail-repair or harness prep only: `docs/mog-critique.md` by path (3–10 rounds, stop when clean). Evidence table only if the task prompt asks.

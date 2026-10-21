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

## Feature recipe (SCORE)

Shell: `nvm use` first (Node 24). No narration, plans or sub-agents; success silent, errors = what/where/next fix.

1. One batch: read `mog-repo-map` (authoritative — don't re-verify in source/cellixjs) + `run-validation`.
2. Targeted `grep -rn` / line-range reads only (nothing >~2KB; never cat whole files). Aim ≤3 read calls, batched in one turn; map + skeletons replace package.json, ADRs, intro docs.
3. Write all files in one pass: wiring file <~30 lines → whole rewrite, imports on top; larger → targeted edits.
4. Run the ONE `run-validation` command (checks, then commit; husky verify = only gate) foreground, long timeout — no self-review, re-read, wait or confirm. Final output one line: `<sha> verify ok · acceptance N/N` (or the failure).

Never read: `pnpm-lock.yaml`, `node_modules/`, `dist/`, `deploy/`, `.husky/`, archunit/`test:arch` internals, `docs/skills-archive/`, agent memory (never write it). Never read or edit `evaluation-run-record.md` or eval/score docs (`docs/eval-contract.md`, `docs/score-metering.md`, `docs/harness-cost-usage.md`) — the operator fills them.

Fail-repair or harness prep only: `docs/mog-critique.md` by path (3–10 rounds, stop when clean). Evidence table only if the task prompt asks.

Dev: `pnpm run dev` / `pnpm run dev:worktree`.

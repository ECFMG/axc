# AXC Agent Instructions (mog-xai-1)

CellixJS architecture. Reference: `/Volumes/files/src/cellixjs` (read targeted files only; never list/tree it).

## Territory (CRITICAL)

- Branch `mog-xai-1` only. Local commits OK. **No push, no PRs.**
- `mog-xai-1-a-out` belongs to Eval Runner — don't drive it. Don't run `task-set-a-prompt.md` yourself.

## Write boundary (CRITICAL)

Write only: `apps/api` · `apps/docs` · `packages/axc/*` · `packages/axc-verification/*` ·
`packages/cellix/**` (only to port a missing capability from CellixJS).

Don't weaken `pnpm run verify`, husky, arch tests or other guardrails. Never `--no-verify`.
Copilot CLI enforces this zero-token via `.github/hooks/write-boundary.{json,py}` (quoted heredoc bodies are stripped before matching).

### Traps

- **Lockfile** (`pnpm-lock.yaml`, root) is outside the boundary: no `pnpm add` / `pnpm install <pkg>`. Needed dep → say so in the summary.
- **Domain** (`packages/axc/domain/src/**`, tests too) must not import `hono`, `@azure/`, `mongoose`, `mongodb`, `@axc/rest`, `@axc/persistence`, `@axc/service-mongoose`, `@axc/application-services`. DB tests → `packages/axc-verification/**`.
- **`packages/cellix/**`** is vendored: reuse (`api-core`, `domain-seedwork`, `mongoose-seedwork`, `serenity-framework`, `local-dev`, `config-*`, `archunit-tests`, …); don't build parallel copies.

## SCORE path (default)

1. Load **`mog-repo-map`** (map + facts + traps), then **`run-validation`**. Nothing else.
2. Never read `docs/eval-contract.md` (Eval Runner only), `dist/`, `deploy/`, or list cellixjs / big trees.
3. Batch reads (several files per call). First write by ~call 6.
4. Iterate package-scoped; one `pnpm run verify` at the end.

Opt-in only: **`mog-critique`** (harness prep or verify/acceptance fail-repair; 3–10 rounds, stop when no new defects). Never on a clean SCORE. Other skills are parked in `docs/skills-archive/` — don't open.

Sources of truth: task prompt/requirements → CellixJS → this repo's verify + layout.

## Gate cost

| need | command |
| --- | --- |
| lint/format area | `pnpm exec biome check <path>` |
| typecheck pkg | `pnpm exec turbo run typecheck --filter=<pkg> --output-logs=errors-only` |
| test pkg | `pnpm exec turbo run test --filter=<pkg> --output-logs=errors-only` |
| final gate (once) | `pnpm run verify > /tmp/verify.log 2>&1 \|\| node scripts/verify-excerpt.mjs /tmp/verify.log` |

SKIPPED ≠ pass — say so.

## Agent-to-agent output (token budget)

Write for the next agent. Code/tests are the deliverable; chat is overhead.

- Compact + structured (tables, bullets, SHA/path/command). No preamble, no restating the task, no per-call narration.
- **Success = minimal/silent.** **Errors = detail:** what failed, where (path/command/gate), next fix.
- Never paste diffs, whole files or green logs.
- Shell: prefix with `nvm use >/dev/null;` (source `$NVM_DIR/nvm.sh` first if `nvm` is missing) (Node 24, `.nvmrc`); Node 20 breaks pnpm 11.
- turbo: always `--output-logs=errors-only`. Long output: `| tail -n 40`.
- Search: `grep -rn` (or `rg -n` if installed — not on every box), then read only that line range.
- Don't re-read a file you just wrote. No sub-agents.
- `test:arch` + `test:acceptance` run only in the final gate.

## Finish with evidence

Short table: one row per requirement/AC id → PASS/FAIL + proving test/file. Then commands run and limitations.

## Cost / usage (eval operators)

After SCORE paste Grok Build `/usage` into the five fields of `evaluation-run-record.md` (map: `docs/score-metering.md`). No silent `n/a` when a meter exists; never invent numbers. Target under nrn-xai (~3.6M tokens / ~$0.86).

## Dev

`pnpm run dev` (Azurite auto-starts) or `pnpm run dev:worktree` (`*.agentcourses.<worktree>.localhost`, worktree-offset ports).

## Later eval feature (not in harness setup)

TS-A `GET /api/courses` (A1–A11, A-AC1–12): ≥12 seeded courses, bad params → `400 INVALID_QUERY_PARAMETER`, no match → `200` + empty `items`. Only when an eval run asks.

## Completion

Stage only in-boundary changes → commit through husky (verify must pass) → stop. No push/PR.

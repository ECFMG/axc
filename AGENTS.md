# AXC Agent Instructions (mog-xai-1)

AXC follows CellixJS architecture. Authoritative Cellix reference:
`/Volumes/files/src/cellixjs`.

## Eval contract

See [`docs/eval-contract.md`](docs/eval-contract.md) for TS-A scoring readiness (Eval Runner / a-out).

## Territory (CRITICAL)

- Work only on branch `mog-xai-1` in this worktree.
- Local commits are OK. **Do not push. Do not open PRs** from `mog-xai-1`.
- Eval Runner owns the `mog-xai-1-a-out` eval flow — do not invent or drive that branch.
- Do **not** run `task-set-a-prompt.md` / Task Set A eval yourself.

## Write Boundary (CRITICAL)

Allowed write paths only:

- `apps/api`
- `apps/docs`
- `packages/axc/*`
- `packages/axc-verification/*`
- Port missing Cellix capability into `packages/cellix/**` from `/Volumes/files/src/cellixjs` when required

Do not modify other trees. Do not weaken `pnpm run verify`, husky, architecture tests, or other guardrails. Never use `--no-verify`.

## Sources of Truth

1. Task prompt / task-set requirements (when an eval agent runs them — not this harness setup).
2. `/Volumes/files/src/cellixjs` for architecture and patterns.
3. This repo’s `pnpm run verify` and existing package layout.

## Skills

First-party procedure skills (not in `skills-lock.json`):

- **`run-validation`** — **mandatory on the default validation path** (targeted checks ending in `pnpm run verify`)
- `plan-feature`, `review-diff`, `tdd`, `serenity-tests` — **optional, off-by-default** (invoke only when explicitly useful for the task)
- Also available from main: `portless`, `turborepo`

Copilot CLI role agents under `.github/agents/` are additive/optional; they do not replace these skills for Grok/Cursor.

## Cost / usage (eval operators)

When filling an Evaluation Run Record after a later TS-A (or TS-B) eval, capture
token/cost into the fields already defined in `evaluation-run-record.md`. See
[`docs/harness-cost-usage.md`](docs/harness-cost-usage.md). Headroom/RTK are
optional if present on a workstation — not required and not installed here.

## Dev Worktrees

`turbo.json` already passes `WORKTREE_NAME`. Prefer:

```bash
pnpm run dev:worktree
```

Hostnames become `*.agentcourses.<worktree-dir>.localhost` via existing `apps/*/scripts/dev.mjs`.

## Later Eval Feature (do NOT implement in harness setup)

Task Set A catalog search (`TS-A-CATALOG-SEARCH`): `GET /api/courses` with A1–A11 and A-AC1–12, ≥12 seeded courses, invalid params → `400 INVALID_QUERY_PARAMETER`, empty match → `200` with empty `items`. Implement only when an eval run explicitly requests it.

## Completion

1. Stage only intended changes inside the write boundary.
2. Commit normally (husky / verify must pass). No `--no-verify`.
3. Stop after local commit — no push, no PR.

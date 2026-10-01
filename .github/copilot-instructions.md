# AXC Development Guide (mog-xai-1)

## Territory

- Branch/worktree: `mog-xai-1` only.
- Local commits OK. **Never push. Never open PRs** from this branch.
- Do not run Task Set A prompts/eval. Eval Runner owns `mog-xai-1-a-out`.

## Write Boundary

Write only under: `apps/api`, `apps/docs`, `packages/axc/*`, `packages/axc-verification/*`.
May port `packages/cellix/**` from `/Volumes/files/src/cellixjs` when a required Cellix capability is missing.
Do not weaken verify/guardrails. Never `--no-verify`.

## Layout

- `apps/api` — Azure Functions / Hono composition root
- `apps/docs` — Docusaurus
- `packages/axc/*` — application (domain, application-services, persistence, rest, …)
- `packages/axc-verification/*` — acceptance-api, archunit-tests
- `packages/cellix/*` — reusable Cellix framework (prefer port over rewrite)

## Commands

```bash
nvm use          # Node >= 24
pnpm install
pnpm run dev              # portless: https://api.agentcourses.localhost
pnpm run dev:worktree     # sets WORKTREE_NAME=$(basename $PWD)
pnpm run test
pnpm run verify           # full gate — respect husky pre-commit
```

`WORKTREE_NAME` is in `turbo.json` `globalPassThroughEnv`. App `dev` scripts already suffix portless hostnames.

## Skills

Use `.agents/skills/` (symlinked from `.github/skills/` for Copilot discovery):
`plan-feature`, `review-diff`, `run-validation`. Final validation → `pnpm run verify`.

## Later Eval (do not implement here)

`GET /api/courses` catalog search (TS-A-CATALOG-SEARCH): A1–A11, A-AC1–12, ≥12 seeded courses, invalid → 400 `INVALID_QUERY_PARAMETER`, empty → 200 empty `items`.

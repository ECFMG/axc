# AXC Development Guide (mog-xai-1)

## Territory

Output: agent-parseable + terse (AGENTS.md “Agent-to-agent output”). Success → minimal; errors → what/where/next fix.

- Branch/worktree: `mog-xai-1` only.
- Local commits OK. **Never push. Never open PRs** from this branch.
- Do not run Task Set A prompts/eval. Eval Runner owns `mog-xai-1-a-out`.


## Copilot CLI (optional)

- Start Copilot CLI from the repo root so `.github/agents/` and `.github/hooks/*.json` load.
- Workflow state: `.agents-work/current/` (see `.github/agents/README.md`).
- Hooks are Copilot-session only — not husky/git pre-commit. Grok/Cursor paths unchanged.
- Reset stale workflow: `touch .agents-work/current/reset.requested`

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

Use `.agents/skills/` (symlinked from `.github/skills/` for Copilot discovery).
**`mog-repo-map`** then **`run-validation`** (mandatory): one chained commit, husky verify = single gate. `docs/mog-critique.md` by path for fail-repair only.
Others archived in `docs/skills-archive/` (`plan-feature`, `review-diff`, `tdd`, `serenity-tests`, `minimal-build`, `portless`, `turborepo`) — not loaded.


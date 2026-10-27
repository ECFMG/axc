# Agent instructions

Read these files before adding or changing domain, application service, persistence, mongoose model, GraphQL, or REST code. Follow them. Do not invent a second layout.

## Read first

- `.agents/skills/cellix-architecture/SKILL.md` — the commands, the files to edit, and which check to run. Open `REFERENCE.md` beside it when a lint or write error names a file role.

While the files are still changing, run `pnpm run check`. The last check before the work is done is `pnpm run verify`. That runs `pnpm run check` first, then build, tests, audit, and Snyk. An agent with `CELLIX_AGENT_ID` is sent back until `.cellix/verify.json` matches the tree. Do not write that file yourself.

## Do not edit

These are the control plane. A human changes them on purpose.

- `cellix-lint.config.json`
- `ocom-write.config.json`
- `packages/cellix/lint/**`
- `packages/cellix/generator/**`
- `.cursor/hooks.json`
- `.cursor/hooks/**`
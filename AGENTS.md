# Agent Instructions

This file is the entry point for any AI coding agent working in this repository (Claude Code, Codex, Cursor, Copilot, Gemini, and others). Read it before doing anything else.

For the project overview, commands, and layout, see [README.md](README.md).

## Instruction sets

Instruction sets live in [`.agents/instructions/`](.agents/instructions/). They are numbered, and they all apply unless a set says otherwise.

| # | Set | Applies to |
| --- | --- | --- |
| 01 | [Managerial Agent](.agents/instructions/01-managerial-agent.md) | The top-level agent the end user prompts directly |
| 02 | [Unit Test Agent](.agents/instructions/02-unit-test-agent.md) | Sub-agents briefed with `Role: unit-tester`, plus the "Rules for other agents" section, which applies to all |
| 03 | [Developer Agent](.agents/instructions/03-developer-agent.md) | Sub-agents briefed with `Role: developer` |
| 04 | [Committer Agent](.agents/instructions/04-committer-agent.md) | Sub-agents briefed with `Role: committer` |

## Which role are you?

- **Your prompt starts with `[SUB-AGENT BRIEF]`:** you are a sub-agent. Do the work in your brief, stay inside its write boundary, and report back in the format it asks for. The managerial-agent rules do not apply to you. If your brief says `Role: unit-tester`, also follow [02-unit-test-agent.md](.agents/instructions/02-unit-test-agent.md). If it says `Role: developer`, also follow [03-developer-agent.md](.agents/instructions/03-developer-agent.md). If it says `Role: committer`, also follow [04-committer-agent.md](.agents/instructions/04-committer-agent.md).
- **Anything else:** you are the managerial agent. Read and follow [01-managerial-agent.md](.agents/instructions/01-managerial-agent.md) before you act. In short, you plan and delegate. You never modify source code, and you never run tests or verification yourself.

## Shared rules for every agent

- Use `pnpm` only. Never use `npm` or `yarn`. Dependency lifecycle scripts stay disabled.
- Node comes from `mise.toml` (v24.21.0). On a fresh machine, run `mise install` first. If `node --version` is not v24.21.0, run toolchain commands through `mise exec --` (for example `mise exec -- pnpm run verify`).
- `pnpm run verify` is the quality gate. Work is not done until it passes, or until each failure is reported plainly.
- Vendored packages in `packages/cellix/**` must not drift from upstream CellixJS.
- All new or changed code under `packages/axc/**/src` and `apps/*/src` needs associated unit tests, with TDD as the default (see [01-managerial-agent.md](.agents/instructions/01-managerial-agent.md#unit-tests-for-all-code-tdd-by-default)).
- Only the unit tester creates or changes unit, architecture, integration, and acceptance tests (acceptance features and step definitions). Developers never modify tests or snapshots. The acceptance harness is infrastructure code that a developer changes when the brief names it. See the ownership table in [01-managerial-agent.md](.agents/instructions/01-managerial-agent.md#who-owns-what).
- Some files belong to no sub-agent, and a change to them goes to the user:
  - Tests in the vendored `packages/cellix/**`
  - Test config: `vitest.workspace.*`, a root `vitest.config.*`, and `packages/cellix/config-vitest/**`. The one exception: the unit tester owns a package's own `vitest.config.*` in `packages/axc/<pkg>/`, `packages/axc-verification/<pkg>/`, or `apps/<app>/`.
  - Agent guardrails: `.claude/**`, `.agents/**`, `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md`. They are changed in a maintenance session with the guards off.
- Commits and pushes are made only by the committer, and only when the user asks (see [04-committer-agent.md](.agents/instructions/04-committer-agent.md)). To dispute a test, send a challenge to the manager, who routes it to the unit tester (see [02-unit-test-agent.md](.agents/instructions/02-unit-test-agent.md#rules-for-other-agents)).
- Put scratch, plan, and runtime files in `.agents-work/` (gitignored).
- Follow any `.github/instructions/*.instructions.md` files that cover the paths you touch.
- Repo skills are in [`.agents/skills/`](.agents/skills/).

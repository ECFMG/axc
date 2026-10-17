# Codex harness for agentCourses

What is in here and how to rerun it on another machine.

| File | Purpose |
| --- | --- |
| `../AGENTS.md` | Rules the agent reads on every request: definition of done, scope, repo map, token discipline |
| `../.agents/skills/cellix-slice/SKILL.md` | CellixJS layout and patterns, loaded only when the agent works on a feature |
| `config.toml` | Model and reasoning effort (`gpt-6.1-sol`, medium), so every machine runs the same settings |
| `hooks.json` | Registers the two hooks below |
| `hooks/verify-gate.mjs` | `sync` (after each tool call): if a `package.json` changed, runs `pnpm install` outside the sandbox. `stop` (when the agent finishes): checks the write boundary, then runs what CI runs (`pnpm install --frozen-lockfile`, `pnpm run verify`) and sends back only the failing lines, at most 3 times |

Hook logs and the manifest fingerprint go to `.agents-work/verify-gate/` (gitignored). They are evidence only and never feed back into a run.

## Prerequisites

Same as the repo README: Node 24 (`nvm use`), pnpm 11.11.0 (via corepack), Azure Functions Core Tools v4, a JRE, and an authenticated Snyk CLI. Codex CLI 0.162.1 (`npm i -g @openai/codex@0.162.1`), signed in with ChatGPT Business. Mac or Linux: the hooks call `/usr/bin/git` and `/bin/sh`.

## Running a task

1. Use a regular `git clone`, not a `git worktree`. For a worktree, Codex reads `.codex/` from the main checkout, so this harness would not load.
2. Check out the harness branch and run `pnpm install --frozen-lockfile`.
3. Trust the folder in `~/.codex/config.toml`:
   ```toml
   [projects."/path/to/your/clone"]
   trust_level = "trusted"
   ```
4. Start `codex` in the clone and approve the hooks when asked. `/hooks` should then show PostToolUse 1 and Stop 1, and `/status` should show `Agents.md: AGENTS.md` and GPT-6.1-Sol medium.
5. Paste the task prompt (`task-set-a-prompt.md` or `task-set-b-prompt.md`) as is, and approve nothing beyond plain one-time prompts. The `github` plugin was disabled in the user config for all recorded runs.

Token usage comes from the session log: the last `token_count` event in `~/.codex/sessions/YYYY/MM/DD/rollout-*-<session-id>.jsonl`.

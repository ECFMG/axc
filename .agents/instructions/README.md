# Agent Instructions

This directory holds the instruction sets that tell AI coding agents how to behave in this repository. They are part of the harness engineering this project evaluates (see the root [README.md](../../README.md)).

## How it fits together

| File | Read by | Purpose |
| --- | --- | --- |
| [`/AGENTS.md`](../../AGENTS.md) | Codex, Cursor, Gemini, and other tools that support `AGENTS.md` | Entry point. Works out the agent's role, lists the instruction sets, and gives shared rules. |
| [`/CLAUDE.md`](../../CLAUDE.md) | Claude Code | Imports `AGENTS.md` (`@AGENTS.md`). |
| [`/.github/copilot-instructions.md`](../../.github/copilot-instructions.md) | GitHub Copilot | Points to `AGENTS.md`. |
| [`/.claude/settings.json`](../../.claude/settings.json) and [`/.claude/hooks/`](../../.claude/hooks/) | Claude Code | Enforces the instruction sets with hooks, where a hook can do it: `manager-guard.mjs` for set 01, `unit-test-guard.mjs` for set 02, `developer-guard.mjs` for set 03, and `committer-guard.mjs` for set 04, with shared logic in `lib/guard-utils.mjs`. See the Enforcement section of each set. |
| [`/.claude/agents/`](../../.claude/agents/) | Claude Code | Sub-agent definitions the manager can spawn by type (`unit-tester`, `developer`, and `committer`). Each one points to its instruction set and does not repeat its rules. |
| `NN-<name>.md` (this directory) | Every agent, through `AGENTS.md` | One instruction set per file, numbered in the order it was added. |

`AGENTS.md` is the single source of truth. The tool-specific files only point to it, so a rule never has to be kept in sync in more than one place.

## Roles

- **Managerial agent:** the top-level agent the end user prompts directly. It plans and delegates. It never modifies source code, and it never runs tests or verification itself.
- **Sub-agent:** any agent the manager spawns. Its prompt starts with `[SUB-AGENT BRIEF]`, which tells it to skip the managerial rules and do the work in its brief.
- **Unit test agent:** a sub-agent briefed with `Role: unit-tester`. It writes, owns, and defends unit, architecture, integration, and acceptance tests, and never changes product code. See [02-unit-test-agent.md](02-unit-test-agent.md).
- **Developer agent:** a sub-agent briefed with `Role: developer`. It writes product code, and other files its brief allows, to meet the requirements and make the unit tests pass. It never modifies tests. See [03-developer-agent.md](03-developer-agent.md).
- **Committer agent:** a sub-agent briefed with `Role: committer`. It stages and commits exactly the files and message in its brief, and pushes if told to, only when the user asked. It never edits files. See [04-committer-agent.md](04-committer-agent.md).

## Adding an instruction set

1. Create `NN-<name>.md` in this directory, using the next number.
2. At the top, say which agents the set applies to.
3. Add a row to the instruction set table in [`/AGENTS.md`](../../AGENTS.md).
4. Add an entry to the change log below.

## Change log

| Date | Set | Change |
| --- | --- | --- |
| 2026-10-02 | 01 | Added the [Managerial Agent](01-managerial-agent.md) instructions. The top-level agent plans, delegates, monitors, and reports. All coding, testing, and verification goes to sub-agents. Added `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md` as the entry points. |
| 2026-10-02 | 01 | Added Claude Code enforcement for set 01. A `PreToolUse` hook (`.claude/hooks/manager-guard.mjs`) blocks file writes, toolchain and test runs, interpreters, and git changes, but only for the top-level agent. Sub-agents are not affected. The hook fails closed, and `AXC_MANAGER_GUARD=off` turns it off. |
| 2026-10-02 | 01 | Tuned the set 01 hook to allow bare `--version` checks, read-only `mise` commands, and more read-only git commands (`check-ignore`, `rev-list`, `ls-remote`, and similar), to deny `mise exec`, `mise run`, and other `mise` commands that change state, and replaced `.nvmrc` with `mise.toml` in the list of protected root config files. |
| 2026-10-02 | 02 | Added the [Unit Test Agent](02-unit-test-agent.md) instructions. A `unit-tester` sub-agent writes unit tests from the requirements, traces each one to a requirement, and defends them against challenges using a fixed list of valid reasons. Added `.claude/agents/unit-tester.md` and wired the role into `AGENTS.md` and set 01. |
| 2026-10-02 | 02 | Added Claude Code enforcement for set 02. A second `PreToolUse` hook (`.claude/hooks/unit-test-guard.mjs`) limits writes to colocated `*.test.ts` and `features/*.feature` files under `packages/axc/*/src/` and `apps/*/src/` (plus `.agents-work/` and the temp dir), blocks new directories, and limits shell use to `pnpm` test, build, and typecheck, vitest, tsc, biome, and read-only git and mise. It only affects `unit-tester` sub-agents (spawned by that agent type), fails closed, and `AXC_UNIT_TEST_GUARD=off` turns it off. Test integrity rules stay instruction-only. The shared logic of `manager-guard.mjs` moved to `.claude/hooks/lib/guard-utils.mjs`, with no change in behavior. |
| 2026-10-02 | 01, 02 | The manager now ensures every code change has associated unit tests, with TDD (red, green, refactor) as the default: an implementer's skeleton first when modules don't exist, a regression test first for bugs, and a test association check by the verifier. Exceptions are listed by file with a reason. |
| 2026-10-02 | 03 | Added the [Developer Agent](03-developer-agent.md) instructions. A `developer` sub-agent writes product code to meet the requirements and pass the unit tests, never modifies unit tests, test config, or snapshots, and disputes a test with a `[TEST CHALLENGE]` routed through the manager. Added `.claude/agents/developer.md` and a third `PreToolUse` hook (`.claude/hooks/developer-guard.mjs`) that blocks writes and shell commands that could alter unit tests, test config, snapshots, or agent guardrails, but only for `developer` sub-agents. It fails closed, and `AXC_DEVELOPER_GUARD=off` turns it off. Renamed the "implementer" role to "developer" in sets 01 and 02, and wired set 03 into `AGENTS.md`. |
| 2026-10-02 | 03 | Aligned the set 03 Enforcement section with the developer hook's actual behavior, grouped into protected paths, blocked shell commands, and allowed actions, and updated sets 01 and 02 for three guards and the `developer.md` restart note. |
| 2026-10-02 | 04 | Added the [Committer Agent](04-committer-agent.md) instructions. Commits and pushes are made only by a `committer` sub-agent, and only when the user asks: it stages the exact files in its brief, checks the staged set, and commits with the given message, knowing the husky pre-commit hook runs lint-staged and the full `pnpm run verify`. Added `.claude/agents/committer.md` and a fourth `PreToolUse` hook (`.claude/hooks/committer-guard.mjs`) that allow-lists read-only commands and narrow staging, commit, push, and branch forms for `committer` sub-agents. It fails closed, and `AXC_COMMITTER_GUARD=off` turns it off. Set 01 gained a Committing section. |
| 2026-10-02 | 02, 03 | The unit tester now owns architecture tests (`packages/axc-verification/archunit-tests/src/`) and integration tests (`tests/integration/` in `packages/axc/<pkg>/` and `apps/<app>/`) as well as unit tests. Vendored cellix tests stay off-limits to every agent, and a change there goes to the user. The developer-guard deny label is now "a test file (owned by the unit-tester)", and the shared path helpers (`isUnitTesterTestPath`, `isNotesOrTempPath`) moved to `lib/guard-utils.mjs`. Set 03's Enforcement section was corrected against the hook code. |
| 2026-10-02 | 01–04 | Final consistency pass: the unit tester owns acceptance tests (features and step definitions) and may run `test:arch` and `test:acceptance`; the acceptance harness is infrastructure code a developer changes when the brief names it; test config and agent guardrails belong to no sub-agent and escalate to the user; set 01 gained an ownership table, a commit brief that states the user's commit request and push approval, and a standalone session-restart note; the committer pushes only with recorded approval and writes multi-line messages with a heredoc (it has no Write tool); set 02 drops the `claude --agent unit-tester` note and names config initializers; set 03 notes the `stash list`/`show` exception and that staging is only on request. |
| 2026-10-02 | 01–03 | User-approved exception: tests/integration/ may be created under packages/axc/<pkg>/ and apps/<app>/ despite task-set no-new-directory rules; a developer creates it on the manager's request. |
| 2026-10-02 | 01 | User decision: vitest and coverage setup for packages/axc packages without one is added when a package first needs tests, with user approval; until then the verifier judges test association from the tests. |

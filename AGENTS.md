# Agent Instructions

Entry point for any AI coding agent in this repository (Claude Code, Codex,
Cursor, Copilot, Gemini, and others).

The working instructions live in [CLAUDE.md](CLAUDE.md) — read it first; it
applies to every agent, not only Claude. Repo orientation (layout, request
flow, test patterns, gate costs) is in
[.claude/skills/axc-orientation/SKILL.md](.claude/skills/axc-orientation/SKILL.md).

Before finishing any task, run the self-checks:

- `python3 .claude/hooks/coverage_gate.py --check` — acceptance-criteria coverage
- `python3 .claude/hooks/secret_gate.py --check` — no secrets in your changes

A full gate run is `corepack pnpm run verify`.

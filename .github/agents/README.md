# Copilot CLI Agent Workflow (AXC mog-xai-1)

Additive for **GitHub Copilot CLI** only. Grok/Cursor and husky/`pnpm run verify` do **not** require these agents or hooks.

## Quick Start

```bash
# From repo root (loads .github/agents and .github/hooks/*.json)
copilot --agent orchestrator
# or: gh copilot / equivalent — start session from repository root
```

## Flow (hook-enforced)

```
PLANNER → IMPLEMENTER(S) → REVIEWER → [one feedback cycle] → DONE
```

State: `.agents-work/current/` (gitignored). Reset: `touch .agents-work/current/reset.requested`

## Agents

| Agent | Role |
|-------|------|
| `orchestrator` | Delegate-only coordinator |
| `planner` | Writes `plan.md` |
| `implementer` / `implementer-research` | Code / read-only research |
| `reviewer` | `review.ok` / `review.feedback` |
| `security` | Informational markers |
| `validator` | Focused verify commands |

## Hooks

`.github/hooks/workflow-enforcement.json` → `sessionStart` + `preToolUse` (`enforce-agent-workflow.sh`).

AXC adaptation: **local `git commit` allowed**; **`git push` / `gh pr` denied**. Between-phase guards require `plan.md` before implementer (deny-without-plan).

## Territory

Branch `mog-xai-1` only. Never push/PR. Never run Task Set A from this harness setup. See `AGENTS.md`.

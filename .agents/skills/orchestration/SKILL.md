---
name: orchestration
description: Coordinate context-partitioned development through planning, implementation, review, and validation.
---

# Orchestration

The primary orchestrator owns task execution, integration, and delivery.
Delegate bounded work to specialist subagents using their persona contracts.

## Workflow

1. **Plan:** Spawn `planner` with the task requirements. Use its execution DAG
   to determine implementation order, ownership, and dependencies.

2. **Implement:** Spawn `implementor` for ready slices, supplying relevant
   requirements, decisions, contracts, and owned paths. Run up to three
   implementors concurrently only when slices are substantial, independent,
   and have stable interfaces with non-overlapping write ownership. Use
   worktree isolation for concurrent writers.

3. **Integrate:** Collect handoffs, integrate changes, and resolve cross-slice
   dependencies before review.

4. **Review:** Spawn `adversarial-reviewer` with the requirements, integrated
   diff, and relevant validation evidence. Route blocking findings to the
   responsible implementor for targeted remediation. Re-review affected
   areas when needed.

5. **Validate:** Spawn `validator` after remediation. Resolve failures through
   targeted corrections and checks; leave full verification to pre-commit.

6. **Deliver:** The orchestrator reviews the final diff, commits, pushes, and
   opens the PR according to `AGENTS.md`.

## Efficiency

- Pass concise handoffs and reference paths, not full agent transcripts.
- Shell output may arrive trimmed. Use the kept failures, diagnostics, and
  summary. Re-run a narrower command when a needed line was omitted.
- Reuse planner decisions; avoid redundant research and validation.
- Execute dependent slices in DAG order, parallelizing only when worthwhile.
- Prefer targeted remediation over repeating entire workflow stages.
- Preserve correctness, architectural integrity, and test quality.

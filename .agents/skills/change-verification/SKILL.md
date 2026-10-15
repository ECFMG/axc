---
name: change-verification
description: How to verify a code change in this repository - knip baseline, network-free checks while iterating, the single final verify command, audit and Snyk handling, and the pre-review self-check list. Use before the first edit of a task, before requesting a review, and before the final summary.
---

# Change verification

## Before the first edit

Run `pnpm run knip` and note what it reports. Anything new it reports after your change (unused files, exports, types or dependencies) comes from your change.

## While iterating

The sandbox has no network access. Run network-free checks directly:

- `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`, `pnpm run test:arch`, `pnpm run test`, `pnpm run knip`
- `pnpm exec biome check --write <files>` applies safe lint and format fixes to files you changed.
- `lsp_get_diagnostics` from the `typescript_lsp` MCP server type-checks a single file quickly.

## Automated hooks

The repository's Codex hooks (`.codex/hooks.json`) also run checks:

- After each file edit, Biome checks the edited files and reports problems as extra context. Fix them before moving on.
- When you finish a turn with uncommitted changes, a stop gate runs the policy check, `biome check`, typecheck, build, knip, `test:arch` and `test`. If one fails, you receive its output as a follow-up prompt. Fix the cause; never weaken a check to pass the gate.

The hooks do not replace the steps below.

## Self-check before review

Check your diff for:

- Every requirement and acceptance criterion in your plan implemented and tested.
- Unit tests in each layer that has logic, covering boundaries and every rejection path.
- Optional dependencies or silent fallbacks; stand-in values; duplicated types or constants.
- Dense or hard-to-follow code that a reviewer would need to unpack.
- Folder, file, export and naming structure matching the `cellix-feature-layout` skill.
- Changes to unrelated lines, including formatting; new entries placed out of the existing order (for example alphabetical dependencies).
- Leftover debug code, TODOs, or unused exports (confirmed with `pnpm run knip` against your baseline).
- Files that are not deliverables (plans, notes, requirement maps, scratch files).
- Generic constant names, one-line `if` statements, and truthiness checks on optional values.
- Documentation updated where the task or spec requires it.

## Final verification

Run it once, at the end, as a single command that needs network approval: `pnpm run verify; pnpm run snyk`. Everything must pass.

- If `pnpm audit` or Snyk reports an advisory introduced by your dependency changes, fix it (for example upgrade or pin a patched version).
- If an advisory already exists on the base commit and fixing it needs files outside the task's write boundary (for example `pnpm-workspace.yaml` overrides), do not fix it; list it in your summary with the patched version.
- Report Snyk authentication or organization errors instead of working around them.

---
name: change-verification
description: How to verify a change in this repository - knip baseline, network-free checks while iterating, what the Codex hooks and stop gate enforce, lockfile and dependency handling, the single final verify command, audit and Snyk handling, and the pre-review self-check. Use before the first edit, before the review, and before the final summary.
---

# Change verification

## Before the first edit
Run `pnpm run knip` and keep its output: anything new it reports after your change came from your change.

## While iterating (no network needed)
Run the test file you are working on (`pnpm exec vitest run <file>` inside the package, after one `pnpm run build`), then the package suite. Run the full `pnpm run test`, `pnpm run test:arch`, `pnpm run typecheck`, `pnpm run build`, `pnpm run lint`, `pnpm run knip` once per layer finished, not after every edit — turbo caches them correctly now, including docs content and the sources `test:arch` inspects.
`pnpm exec biome check --write <files>` applies safe fixes.

## What the hooks do (`.codex/hooks.json`)
- **Before a tool runs**: edits to harness files (`AGENTS.md`, `.codex/`, `.agents/`, `.husky/`, `biome.json`, `knip.json`, `turbo.json`, `packages/cellix/`), to `pnpm-lock.yaml` or `pnpm-workspace.yaml`, dependency commands (`pnpm add|remove|update`), `git commit --no-verify`, and planning files (`plan.md`, `notes.md`, `requirements-map.md`, …) outside `docs/` are denied with a reason. Shell redirections and `tee`/`sed -i` are inspected too. A denial is not an obstacle to route around; it means the action is out of scope.
- **After an edit**: Biome checks the written files and reports problems as extra context. Fix them before moving on.
- **When you stop after changing files (committed or not)**: the stop gate runs the script policy, `biome check`, typecheck, build, knip, `test:arch`, `test` and a lockfile check. A failure comes back as a follow-up prompt (at most twice). Fix the cause. Each run appends evidence to `$TMPDIR/codex-stop-gate/<session>-evidence.jsonl`; cite that path in the final summary. Do not run `stop-gate.mjs` yourself — it doubles the gate cost and leaves duplicate evidence.

## Dependencies and the lockfile
- Dependencies are fixed for a task. If a spec explicitly requires a package change, edit `package.json` and run `pnpm install --offline`; never edit `pnpm-lock.yaml` by hand. The resulting lockfile diff is permitted output even when the task's write boundary excludes the lockfile (the boundary forbids hand edits, not generated output); report `git diff --stat pnpm-lock.yaml` in the summary. It must contain only entries caused by your `package.json` change.
- Use `catalog:` for packages in the `pnpm-workspace.yaml` catalog (`mongoose`, `mongodb-memory-server-core`).

## Storage and errors
- When a task leaves a storage or persistence choice open, record it in `apps/docs/docs/adr/<nnnn>-<slug>.md` (context, decision, consequences) and add it to the sidebar as `adr/<slug>`.
- Unexpected 500s: read the API log before changing code; never swallow the error to make a test pass.

## Self-check before review
- Every requirement in your map implemented and tested; tests seen failing before implementation.
- Unit tests in every layer that has logic, covering boundaries and each rejection path.
- No optional dependencies, silent fallbacks, stand-in values, duplicated types or constants.
- Layout matches `cellix-feature-layout`; `test:arch` green.
- No unrelated line changes, out-of-order entries, debug code, TODOs, unused exports (knip vs baseline), or non-deliverable files.
- Documentation updated where the task or spec requires it, at the paths in `cellix-feature-layout`; `pnpm run build` must show `@apps/docs:build` executing (a cache hit after a doc change means the inputs are wrong — report it, do not edit `turbo.json`).

## Final verification
Once, at the end, as one command that needs network approval: `pnpm run verify; pnpm run snyk`. Everything must pass. Then commit (conventional message, hook active) and finish; the Stop hook runs the gate on the committed result.
- An advisory introduced by your change: fix it (upgrade or pin). An advisory already on the base commit whose fix needs files outside your write boundary: list it in the summary with the patched version.
- Report Snyk authentication or organization errors; do not work around them.

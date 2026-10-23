---
name: run-validation
description: How AXC validates — the Stop hook installs, verifies (husky) and commits. Nothing to run.
---

# run-validation

Write, then stop. On Stop, `scripts/stop-gate.mjs` runs `pnpm install --frozen-lockfile` and commits; husky `pre-commit` runs the full verify once. Green → committed, silent. Red → stop blocked, one line per problem (file + TS code / biome rule / test / knip / AC), nothing committed: fix, stop again.

What not to run, the no-hook fallback and fail-repair: `AGENTS.md` (recipe step 3, critique line).

---
name: run-validation
description: How AXC validates — the Stop hook installs, verifies (husky) and commits. Nothing to run.
---

# run-validation

Write, then stop. On Stop, `scripts/stop-gate.mjs` runs `pnpm install --frozen-lockfile` and commits; husky `pre-commit` runs the full verify once. Green → committed, silent. Red → stop blocked, one line per problem (file + TS code / biome rule / test / knip / AC), nothing committed: fix, stop again.

- Never run `pnpm run verify`, `test:arch`, acceptance or `git commit` yourself; never `--no-verify`.
- No Stop hook (non-Grok tool): `node scripts/stop-gate.mjs run` once at the end.
- Repeated failure → `docs/mog-critique.md` (by path; 3–10 rounds).

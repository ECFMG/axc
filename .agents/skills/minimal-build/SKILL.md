---
name: minimal-build
description: >
  YAGNI / reuse-before-write / fewest-files guidance for AXC implementation.
  Use when implementing or refactoring inside the write boundary. Optional —
  off by default; not loaded on the SCORE path (SCORE loads run-validation only).
---

# Skill: Minimal Build

Ship the smallest change that satisfies every numbered requirement and passes
`pnpm run verify`. Stay inside the write boundary in `AGENTS.md`.

## Ladder (stop at the first rung that holds)

1. **Does this need to exist?** Speculative need → skip; say so in one line (YAGNI).
2. **Already in this repo?** Reuse `packages/cellix/*`, `@axc/*`, or nearby helpers before writing new ones.
3. **Stdlib / already-installed dep?** Use it. Do not `pnpm add` (lockfile is outside the boundary).
4. **One file before four.** Shortest working diff in the right place.
5. **Only then:** minimum new code that works.

## Rules

- No unrequested abstractions (one-impl interface, one-product factory, config for a constant).
- No scaffolding "for later".
- Deletion over addition. Boring over clever.
- Bug fix = root cause once, not a guard in every caller.
- Domain stays free of infrastructure imports (see AGENTS boundary traps).

## Output

Code first. At most three short lines: what was skipped, when to add it.
No diff dumps, no file echoes, no essays.

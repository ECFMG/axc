---
name: run-validation
description: The one AXC gate command — checks, then commit (husky verify). Run once after writing.
---

# run-validation

## Gate — ONE command after writing (checks, then commit → husky verify)

Foreground, long shell timeout (≥15 min); no diff / `git status` / re-read first; don't background or poll.

```bash
{ . "${NVM_DIR:-$HOME/.nvm}/nvm.sh" && nvm use; } >/dev/null 2>&1; { pnpm exec turbo run typecheck test --filter='[HEAD]' --output-logs=errors-only && pnpm run knip && node scripts/check-ac-coverage.mjs && pnpm exec biome check --write apps/api apps/docs packages/axc packages/axc-verification; } >/tmp/check.log 2>&1 || { tail -n 30 /tmp/check.log; false; } && git add -A apps/api apps/docs packages/axc packages/axc-verification && git commit -qm "<feature summary>"
```

Check failure → 30-line tail, nothing committed; biome formats last, so a failed check leaves your files as written. `[HEAD]` = packages changed vs HEAD (incl. new files). No `test:arch` / acceptance / verify outside husky.

Verify runs **once**, inside husky `pre-commit` (full `pnpm run verify`). Don't run `pnpm run verify` yourself.

- Success → exactly one line: `verify ok · acceptance N/N · <sha>`. Report it; stop.
- Fail → commit blocked; ≤80-line excerpt + full log path. Fix, re-run the same command (both failure kinds). Open the log by line range only if the excerpt isn't enough.
- No separate AC grep, `git status` or log reads after success. Never read `.husky/`, eval/score docs, `pnpm-lock.yaml`, `node_modules/` or agent memory; never write memory.
- Never `--no-verify`. SKIPPED gate ≠ pass.
- Repeated failure → `docs/mog-critique.md` (by path; 3–10 rounds).

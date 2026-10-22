---
name: run-validation
description: The one AXC gate command — checks, then commit (husky verify). Run once after writing.
---

# run-validation

## Gate — ONE command after writing (checks, then commit → husky verify)

Run it in the FOREGROUND; set the shell timeout/wait to ≥10 min (gate ≈1–2 min): no background, no polling. No diff / `git status` / re-read first.

```bash
{ . "${NVM_DIR:-$HOME/.nvm}/nvm.sh" && nvm use; } >/dev/null 2>&1; { pnpm exec biome lint apps/api apps/docs packages/axc packages/axc-verification; l=$?; pnpm exec turbo run typecheck test --filter='[HEAD]' --output-logs=errors-only && [ $l = 0 ] && pnpm run knip && node scripts/check-ac-coverage.mjs && pnpm exec biome check --write apps/api apps/docs packages/axc packages/axc-verification; } >/tmp/check.log 2>&1 || { node scripts/check-summary.mjs /tmp/check.log; false; } && git add -A apps/api apps/docs packages/axc packages/axc-verification && git commit -qm "<feature summary>"
```

Check failure → one line per problem (file + biome rule / TS code / test name / knip / AC), nothing committed. Read-only `biome lint` (useAwait, unused imports…) reports with typecheck/test in one pass; `--write` formats last, so a failed check leaves your files as written. `[HEAD]` = packages changed vs HEAD (incl. new files). No `test:arch` / acceptance / verify outside husky.

Verify runs **once**, inside husky `pre-commit` (full `pnpm run verify`). Don't run `pnpm run verify` yourself.

- Success → exactly one line: `verify ok · acceptance N/N · <sha>`. Report it; stop.
- Fail → commit blocked; ≤80-line excerpt + full log path. Fix, re-run the same command (both failure kinds). Open the log by line range only if the excerpt isn't enough.
- No separate AC grep, `git status` or log reads after success. Never read `.husky/`, eval/score docs, `pnpm-lock.yaml`, `node_modules/` or agent memory; never write memory.
- Never `--no-verify`. SKIPPED gate ≠ pass.
- Repeated failure → `docs/mog-critique.md` (by path; 3–10 rounds).

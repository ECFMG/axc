---
name: run-validation
description: Final gate for AXC changes — one chained format + stage + commit; husky's verify is the single gate. Use once at the end.
---

# run-validation

## First check — ONE command after writing (lint fails here, not at the commit gate)

```bash
{ . "${NVM_DIR:-$HOME/.nvm}/nvm.sh" && nvm use; } >/dev/null 2>&1; { pnpm exec biome check --write <touched files> && pnpm exec turbo run typecheck test --filter='[HEAD]' --output-logs=errors-only && pnpm run knip; } >/tmp/check.log 2>&1 || { tail -n 40 /tmp/check.log; false; }
```

Silent = green. `[HEAD]` = packages changed vs HEAD (incl. new files). No `test:arch` / acceptance / full verify mid-task.

## Final gate — ONE command, right after typecheck/test go green

No diff / `git status` / re-read review first. Takes minutes: run it in the **foreground with a long shell timeout** (≥15 min); don't background it or poll a log.

```bash
{ . "${NVM_DIR:-$HOME/.nvm}/nvm.sh" && nvm use; } >/dev/null 2>&1; pnpm exec biome check --write apps/api apps/docs packages/axc packages/axc-verification >/tmp/biome.log 2>&1 || { tail -n 40 /tmp/biome.log; false; } && git add -A apps/api apps/docs packages/axc packages/axc-verification && git commit -qm "<feature summary>"
```

Verify runs **once**, inside husky `pre-commit` (full `pnpm run verify`). Don't run `pnpm run verify` yourself.

- Success → exactly one line: `verify ok · acceptance N/N · <sha>`. Report it; stop.
- Fail → commit blocked; ≤80-line excerpt + full log path. Fix, re-run the same command. Open the log by line range only if the excerpt isn't enough.
- No separate AC grep, `git status` or log reads after success. Never read `.husky/`, eval/score docs, `pnpm-lock.yaml`, `node_modules/` or agent memory; never write memory.
- Never `--no-verify`. SKIPPED gate ≠ pass.
- Repeated failure → `docs/mog-critique.md` (by path; 3–10 rounds).

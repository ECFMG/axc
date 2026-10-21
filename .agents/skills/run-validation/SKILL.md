---
name: run-validation
description: Final gate for AXC changes — one chained format + stage + commit; husky's verify is the single gate. Use once at the end.
---

# run-validation

While iterating: package-scoped only (`pnpm exec turbo run typecheck|test --filter=<pkg> --output-logs=errors-only`). No `test:arch` / acceptance / full verify mid-task.

## Final gate — ONE command

```bash
{ . "${NVM_DIR:-$HOME/.nvm}/nvm.sh" && nvm use; } >/dev/null 2>&1; pnpm exec biome check --write apps/api apps/docs packages/axc packages/axc-verification >/tmp/biome.log 2>&1 || { tail -n 40 /tmp/biome.log; false; } && git add -A apps/api apps/docs packages/axc packages/axc-verification && git commit -qm "<feature summary>" && git log --oneline -1
```

Verify runs **once**: inside husky `pre-commit` (full `pnpm run verify`, quiet). Don't run `pnpm run verify` yourself — that doubles it. Red verify blocks the commit and prints a ≤80-line excerpt + full log path.

- Success → one line (`<sha> <msg>`). Report `verify OK <sha>`.
- Fail → fix from the excerpt; open the log by line range only if needed; re-run the same command.
- No extra steps: no separate A-AC grep, `git status`, or log reads after success. Don't read `.husky/`, `docs/score-metering.md` or agent memory; don't write memory.
- Never `--no-verify`. SKIPPED gate ≠ pass.
- Repeated failure → `docs/mog-critique.md` (by path; 3–10 rounds).

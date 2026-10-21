---
name: run-validation
description: Reusable validation procedure for build, test, lint, architecture, and security checks. Use when verifying changes before review completion or final handoff.
---

# Skill: Run Validation

Validate AXC changes before marking work complete. Keep context minimal: targeted checks while iterating, **one** full gate at the end.

## When to Use

- After implementation, before commit/handoff
- After fixing review or security findings
- Default SCORE / harness validation path (do not load other skills unless needed)

## Procedure

### Iterate with targeted checks

Prefix every shell command with `nvm use >/dev/null;` (source `$NVM_DIR/nvm.sh` first if `nvm` is missing) (Node 24 per `.nvmrc`).

Prefer package-scoped commands while fixing:

```bash
pnpm exec biome check <paths>
pnpm exec turbo run typecheck --filter=<pkg> --output-logs=errors-only
pnpm exec turbo run test --filter=<pkg> --output-logs=errors-only
```

Arch + acceptance run only in the final gate. Re-run one of them alone only to diagnose its own failure.

### Single final verify

```bash
pnpm run verify > /tmp/verify.log 2>&1 || node scripts/verify-excerpt.mjs /tmp/verify.log
```

Use **once** before final completion. Pass → no output (report `verify OK`). Fail → excerpt only (≤80 lines: failed tasks, error lines + context); open `/tmp/verify.log` by line range only if the excerpt is not enough. Husky runs verify on commit — do not bypass with `--no-verify`.

## Validation Matrix

| Change Type | Build | Test | Lint | Arch | Snyk | Acceptance |
| --- | --- | --- | --- | --- | --- | --- |
| Domain / app services | yes | yes | yes | yes | - | as needed |
| REST / API | yes | yes | yes | optional | - | yes |
| Persistence | yes | yes | yes | optional | - | optional |
| Dependencies | yes | yes | yes | - | yes | - |
| Docs only | optional | - | yes | - | - | - |

## Failure Recovery

1. Read the excerpt from `scripts/verify-excerpt.mjs` (failure only — never paste full logs)
2. Fix the root cause
3. Re-run the failing step only
4. Re-run earlier steps only if the fix could regress them
5. Finish with a single `pnpm run verify`

On verify / acceptance fail, may load **`mog-critique`** for structured adversarial self-critique (opt-in repair) — do **not** make it mandatory SCORE.

## Agent-to-agent output

- Green / pass: report minimally (e.g. `verify OK`) — do not paste success logs.
- Fail: include gate name, failing package/path, key error line(s), and next fix.
- Structured over prose. See AGENTS.md “Agent-to-agent output”.

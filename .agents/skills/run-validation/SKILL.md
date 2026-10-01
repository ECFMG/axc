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

Prefer package-scoped commands while fixing:

```bash
pnpm --filter @axc-verification/acceptance-api test:acceptance
pnpm --filter @axc-verification/archunit-tests test:arch
pnpm run lint
pnpm run format:check
```

Run build/test/arch/snyk individually only when diagnosing a failure — avoid repeating the full suite.

### Single final verify

```bash
pnpm run verify
```

Use **once** before final completion. Husky runs verify on commit — do not bypass with `--no-verify`.

## Validation Matrix

| Change Type | Build | Test | Lint | Arch | Snyk | Acceptance |
| --- | --- | --- | --- | --- | --- | --- |
| Domain / app services | yes | yes | yes | yes | - | as needed |
| REST / API | yes | yes | yes | optional | - | yes |
| Persistence | yes | yes | yes | optional | - | optional |
| Dependencies | yes | yes | yes | - | yes | - |
| Docs only | optional | - | yes | - | - | - |

## Failure Recovery

1. Read the failing output
2. Fix the root cause
3. Re-run the failing step only
4. Re-run earlier steps only if the fix could regress them
5. Finish with a single `pnpm run verify`

## Agent-to-agent output

- Green / pass: report minimally (e.g. `verify OK`) — do not paste success logs.
- Fail: include gate name, failing package/path, key error line(s), and next fix.
- Structured over prose. See AGENTS.md “Agent-to-agent output”.

---
name: run-validation
description: Reusable validation procedure for build, test, lint, architecture, and security checks. Use when verifying changes before review completion or final handoff.
---

# Skill: Run Validation

Validate AXC changes before marking work complete.

## When to Use

- After implementation, before commit/handoff
- After fixing review or security findings
- Whenever targeted verification is needed

## Procedure

### 1. Build

```bash
pnpm run build
```

### 2. Tests

```bash
pnpm run test
```

Target packages when possible, e.g.:

```bash
pnpm --filter @axc-verification/acceptance-api test:acceptance
pnpm --filter @axc-verification/archunit-tests test:arch
```

### 3. Lint / Format Check

```bash
pnpm run lint
pnpm run format:check
```

### 4. Architecture

```bash
pnpm run test:arch
```

### 5. Security

```bash
pnpm run snyk
```

### 6. Full Gate

```bash
pnpm run verify
```

Use before final completion. Husky runs verify on commit — do not bypass with `--no-verify`.

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
3. Re-run the failing step
4. Re-run earlier steps if the fix could regress them
5. Finish with `pnpm run verify`

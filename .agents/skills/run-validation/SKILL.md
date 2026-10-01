---
name: run-validation
description: >
  Validate AXC changes using targeted checks during development and the
  repository verification gate at completion. Use when verifying implementation
  changes, recovering from validation failures, or preparing completed work for
  commit.
---

# Run Validation

Use targeted validation while developing. Use the repository's authoritative
verification gate for completed work.

## Targeted Validation

Run the narrowest check that provides useful feedback for the current change.

Common root commands:

    pnpm run test:acceptance
    pnpm run test:arch
    pnpm run typecheck
    pnpm run build
    pnpm run lint

For unit-level TDD, prefer the affected package's test command or a filtered
test run rather than root `pnpm run test`.

Root `pnpm run test` runs both package tests and acceptance tests, so use it when
that broader test scope is intended.

Follow `tdd` for the normal RED -> GREEN -> REFACTOR loop.

## Full Verification

The authoritative repository gate is:

    pnpm run verify

It runs the repository's required script-policy, Biome, typecheck, build,
dead-code, dependency-analysis, architecture, test, audit, and security checks.

Do not duplicate those checks individually immediately before `verify` unless
there is a specific diagnostic reason.

For completed implementation, commit normally and allow the repository
pre-commit hook to execute its required validation. Do not bypass the hook or
use `--no-verify`.

Run `pnpm run verify` explicitly when full verification is required without
committing.

## Failure Recovery

When validation fails:

1. Identify the failing check and root cause.
2. Fix the implementation rather than weakening the guardrail.
3. Re-run the narrowest check that reproduces the failure.
4. Retry full verification once the targeted check passes.

Do not report validation as passing unless the required check actually ran
successfully.
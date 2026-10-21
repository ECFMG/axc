---
name: plan-feature
description: Reusable planning procedure for a new feature or significant change. Use when the task needs a scoped implementation plan with dependencies, risks, and validation steps.
---

# Skill: Plan Feature

Reusable procedure for planning a new feature or significant AXC change.

## When to Use

- New bounded context, aggregate, or application service
- New REST/API endpoint or docs contract
- Cross-cutting changes spanning multiple `packages/axc/*` packages

## Procedure

### 1. Understand the Goal

- Read the request and acceptance criteria
- Clarify ambiguities only if they materially change scope
- Stay inside the write boundary in `AGENTS.md`

### 2. Analyze the Codebase

- Prefer `/Volumes/files/src/cellixjs` patterns over inventing alternatives
- Search for similar AXC implementations under `packages/axc/`
- Map change to dependency order (typical):

```text
@axc/domain → @axc/application-services → @axc/persistence → @axc/rest → @apps/api
@axc-verification/acceptance-api (acceptance) alongside behavior
```

### 3. Identify Instruction / Pattern Sources

- Cellix reference: `/Volumes/files/src/cellixjs`
- Package READMEs / manifests under `packages/axc/*` and `packages/cellix/*`
- Existing acceptance scenarios in `@axc-verification/acceptance-api`

### 4. Break Into Tasks

Keep tasks small; respect layering:

1. Domain / value objects if needed
2. Application services / use cases
3. Persistence if needed
4. REST/API surface (`@axc/rest`, wired in `@apps/api`)
5. Acceptance + unit tests
6. Docs contract under `apps/docs` when the public API changes

### 5. Flag Risks

- `security` — auth, input validation, data access
- `breaking-change` — public API / shared types
- `perf` — query or hot-path impact
- `none` — routine

### 6. Define Validation

```bash
pnpm run build
pnpm run test
pnpm run lint
pnpm run verify   # before final handoff
```

Use `run-validation` for the full procedure.

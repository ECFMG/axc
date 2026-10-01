---
name: review-diff
description: Structured code-review procedure for changed files. Use when reviewing a diff for correctness, regressions, security, and test coverage.
---

# Skill: Review Diff

Reusable procedure for a structured review of AXC changes.

## When to Use

- After implementation tasks complete
- Before local commit / handoff
- For a final pass over the session diff

## Procedure

### 1. Identify Changed Files

- List created, modified, and deleted files
- Confirm every path is inside the write boundary (`AGENTS.md`)
- Group by package for systematic review

### 2. Read Changed Files in Full

- Read every changed file completely, not just hunks
- For deletes, check dangling references
- For new files, check naming and barrel exports

### 3. Trace Dependencies

- Follow imports from and to changed files
- Check shared interfaces for consistency

### 4. Review Checklist

#### Security

- Input validated at boundaries
- No secrets leaked; errors do not expose internals
- Authorization where domain operations require it

#### Architecture

- No infrastructure imports in domain
- Layering matches existing `@axc/*` / Cellix patterns
- Do not weaken verify, arch tests, or husky

#### Logic and Correctness

- Edge cases handled; callers not broken
- TypeScript strictness preserved

#### Testing

- Behavior changes have matching tests
- Tests assert behavior, not implementation details

### 5. Devil's Advocate

Unexpected input, concurrency, dependency failure, malicious use.

### 6. Classify Findings

`blocker` | `major` | `minor` | `nit`

### 7. Report

```text
[severity] Category — file:line
Issue: what's wrong and why
Fix: concrete instruction
```

# Coding task validation

Task: TS-A-CATALOG-SEARCH

Result: NOT PASSED

Base: `fe47c38d32376c5e8bcd1d67838160064fd5de99`

Branch: `df-oai-0-a-out`

Scope: pass

| Command | Exit | Seconds |
| --- | ---: | ---: |
| `pnpm test --env-mode=loose` | 1 | 3.98 |
| `pnpm run lint` | 1 | 0.62 |
| `pnpm run build --env-mode=loose` | 1 | 1.80 |
| `pnpm run typecheck --env-mode=loose` | 2 | 1.47 |
| `pnpm run test:arch --env-mode=loose` | 1 | 1.74 |
| `node /Users/dfortun/Documents/Codex/2026-10-12/have/work/v7.12-task-a-baseline/run/verification/course_acceptance.mjs` | 1 | 0.13 |
| `node /Users/dfortun/Documents/Codex/2026-10-12/have/work/v7.12-task-a-baseline/run/verification/course_acceptance.mjs --host` | 1 | 4.30 |
| `python3 /Users/dfortun/Documents/Codex/2026-10-12/have/work/v7.12-task-a-baseline/run/verification/task_a_gates.py --repo . --base fe47c38d32376c5e8bcd1d67838160064fd5de99 --out /Users/dfortun/Documents/Codex/2026-10-12/have/work/v7.12-task-a-baseline/run/validation-001/submitted` | 1 | 1.57 |

Usage: provider_reported. Total tokens: 255219.

Checks establish only their covered behavior. Scope auditing cannot prevent temporary writes, external calls or semantic changes to authentication. Review the patch.

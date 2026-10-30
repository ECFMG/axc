# Run record — TS-A-CATALOG-SEARCH

Branch: `jjm-cur-3-jjm-a-out`

Date: 2026-10-29

## Static analysis

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm run agent-check -- pnpm run check` | PASS | Biome, Cellix lint, and TypeScript typecheck. Re-run at the end of this session passed in 2.2s. |
| Cellix lint | ok | Included in `check`. An earlier failure required removing a module-level helper from the course read repository. |
| `pnpm run test:arch` | PASS | 20 tasks successful, 20 cached, 84ms. |

## Tests

| Suite | Result | Detail |
| --- | --- | --- |
| Acceptance `@axc-verification/acceptance-api` | PASS | 17 scenarios, 17 successful. Real time 10.9s. |
| Course Search | PASS | 16 successful, 16 total, 10.6s. |
| Healthcheck | PASS | 1 successful, 1 total. Existing `GET /health` contract still holds. |

Course Search scenarios:

- Default list: page 1, page size 10, 10 items, 12 total, 2 pages
- Keyword `q=SeCuRiTy`: 4 matches across title, summary, and tags
- `modality=online`: 5 courses, all online
- `status=active`: 5 courses, all active
- `tag=AI`: 2 courses
- Combined `q=security&modality=online&status=active`: 2 courses
- `page=1&pageSize=5`: 5 items, 12 total, 3 pages, first title `AI Security Foundations`
- `sort=createdAt`: first title `Example title`
- Invalid query 400 `INVALID_QUERY_PARAMETER`: `modality=remote`, `status=published`, `page=0`, `page=abc`, `pageSize=0`, `pageSize=51`, `sort=rank`
- No match `q=zzznomatch`: 200, empty items, total 0, total pages 0

## Build and verify

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm run agent-check -- pnpm run verify` | `CELLIX_VERIFY=pass` | First full run in this session took 77.7s and covers lint, typecheck, build, knip, e18e, architecture tests, unit and acceptance tests, audit, and Snyk. A later stamp check returned pass in 0.4s. Two later verify invocations were interrupted before they printed a result. |
| `pnpm install` | Done | Workspace already up to date after package dependency edits. 6.3s. |

## Timing

| Slice | Duration |
| --- | --- |
| Wall clock for the implementation | about 11 minutes (3:34 PM–3:45 PM) |
| Command wait during implementation | 1m 53s |
| Of which `verify` | 77.7s |
| Of which repeated `check` | 24.9s |
| Acceptance re-run for this record | 10.9s scenarios, about 36s including report generation and arch tests |

Token or credit usage is not exposed in this session.

## Limitations

- Sort is ascending only.
- Keyword search is a case-insensitive substring match.
- Pagination is applied in the REST adapter after the read repository returns the matching courses.
- Course ids in the seed are 24-character hex strings.

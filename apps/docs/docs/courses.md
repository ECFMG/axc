# Course catalog

`GET /api/courses` searches the sample training catalog without external services.

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Query parameter | Allowed values and behavior | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring in title, summary, or any tag | No keyword filter |
| `modality` | `online`, `in-person`, `hybrid` | All modalities |
| `status` | `draft`, `active`, `retired` | All statuses |
| `tag` | Case-insensitive whole tag match | All tags |
| `page` | Positive safe integer, starting at 1 | `1` |
| `pageSize` | Integer from 1 to 50 | `10` |
| `sort` | `title`, `createdAt`, `updatedAt` | `title` |

Filters combine with AND. Search text and tags are trimmed; blank values are invalid.
Enum values are case-sensitive. Unknown or repeated query parameters are invalid.
Sorting is ascending, with course ID as a deterministic tie breaker. Dates use ISO strings.
Pagination applies after filtering and sorting. `totalItems` counts all matches.
No matches return HTTP 200 with empty `items`, `totalItems: 0`, and `totalPages: 0`.
A page past the last page returns empty `items` and retains the matching totals.

## Success response

HTTP 200, `application/json`:

```json
{
  "items": [
    {
      "id": "course-001",
      "title": "AI Security Foundations",
      "summary": "Introductory course on secure AI-assisted development.",
      "modality": "online",
      "status": "active",
      "tags": ["ai", "security"],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-06-12T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

## Error response

HTTP 400, `application/json`, for example with `?pageSize=51`:

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [
      {
        "field": "pageSize",
        "message": "pageSize must be between 1 and 50."
      }
    ]
  }
}
```

`details` contains field-specific validation messages for invalid parameters.

## Implementation and scope

The domain owns the Course projection, enums, and read-only catalog contract.
Cellix's existing repository contract supports aggregate get/save; catalog search uses a separate read-only projection contract.
The composition root injects a persistence fixture catalog into application services.
The sample has 12 courses spanning all modalities and statuses; it is held in memory and has no write endpoint.
Search scans this small catalog in application services; REST owns parsing and HTTP errors.
All dates and course IDs are fixture data. Persistence across process restarts and database indexing are outside this sample's scope.

Only existing workspace dependencies were added for shared domain contracts, catalog wiring, and the existing Vitest harness.
No new external libraries are required. TypeScript project references and REST test configuration support those imports and tests.

## Requirement and validation map

| Requirement / acceptance criterion | Implementation | Verification |
| --- | --- | --- |
| Course fields; 12 mixed fixtures | `domain/src/course.ts`, `persistence/src/course-catalog.ts` | Acceptance default catalog scenario |
| A1; A-AC1 | REST course route and API registration | Default acceptance scenario; REST defaults unit test |
| A2–A6; A-AC2–A-AC5 | `application-services/src/courses.ts` | Search/filter unit tests; exact-ID acceptance examples |
| A7; A-AC6 | Service pagination and REST defaults | Pagination unit/acceptance scenarios |
| A8; A-AC7 | Service sorting | All three sort unit/acceptance examples |
| A9; A-AC8 | `rest/src/courses.ts` | Validation unit/acceptance examples |
| A-AC9 | Service no-match result | No-match unit/acceptance scenarios |
| A10; A-AC10–A-AC11 | Unit and acceptance suites | Existing health tests; two filter combinations; full verification |
| A11; A-AC12 | This document | Documentation build |

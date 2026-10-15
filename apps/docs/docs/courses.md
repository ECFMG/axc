---
title: Course catalog
---

`GET /api/courses` searches the sample training catalog. No external database is
required: the application service contains 12 fixed courses with mixed modalities,
statuses and tags. This read-only fixture resets with each process and is not a
production storage implementation.

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Parameter | Behavior | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring in title, summary or any tag | No keyword filter |
| `modality` | `online`, `in-person`, `hybrid` (case-sensitive) | All modalities |
| `status` | `draft`, `active`, `retired` (case-sensitive) | All statuses |
| `tag` | Exact tag match, case-insensitive | All tags |
| `page` | Positive safe integer | `1` |
| `pageSize` | Integer from 1 through 50 | `10` |
| `sort` | `title`, `createdAt`, `updatedAt` | `title` |

Filters combine with AND. Whitespace around `q` and `tag` is trimmed; blank values
are ignored. Numeric parameters accept decimal digits only. Unknown parameters,
repeated parameters, empty enums and invalid values return 400.

Sorting is ascending, with English locale title ordering, chronological ISO date
ordering and an ID tie-breaker. Filtering and sorting happen before pagination.
`totalItems` counts all filtered courses, and `totalPages` is rounded up. No
matches return 200 with `items: []` and both totals zero. A page beyond the last
page returns an empty array while preserving the totals.

Example 200 response (request with `q=foundations`):

```json
{
  "items": [{
    "id": "course-001",
    "title": "AI Security Foundations",
    "summary": "Introductory course on secure AI-assisted development.",
    "modality": "online",
    "status": "active",
    "tags": ["ai", "security"],
    "createdAt": "2026-01-15T00:00:00.000Z",
    "updatedAt": "2026-06-01T00:00:00.000Z"
  }],
  "page": 1,
  "pageSize": 10,
  "totalItems": 1,
  "totalPages": 1
}
```

Example 400 response (`pageSize=51`):

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [{
      "field": "pageSize",
      "message": "pageSize must be between 1 and 50."
    }]
  }
}
```

Run the catalog integration tests with
`pnpm exec turbo run test --filter=@axc-verification/acceptance-api`.
They use the built Hono application and application services in process, without
Azure Functions or external services.

# Course catalog

`GET /api/courses` searches the sample training catalog. All filters combine with AND.

| Query | Meaning | Default |
| --- | --- | --- |
| `q` | Case insensitive substring in title, summary, or any tag | No keyword filter |
| `modality` | `online`, `in-person`, `hybrid` | All modalities |
| `status` | `draft`, `active`, `retired` | All statuses |
| `tag` | Case insensitive exact tag match | All tags |
| `page` | Safe integer, at least 1 | 1 |
| `pageSize` | Integer from 1 through 50 | 10 |
| `sort` | `title`, `createdAt`, `updatedAt` | `title` |

Sorting is ascending, with course ID breaking ties. Filtering and sorting happen before pagination. Dates use ISO strings. Empty results and pages past the end return 200 with empty `items`; `totalPages` is 0 when nothing matches. Search text and tags are trimmed. Enum values are case sensitive. Unknown or repeated parameters, empty values, invalid enums, non-digit integers, unsafe integers, and out-of-range numbers return 400. All detected problems are collected.

Example: `/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title`.

HTTP 200:

```json
{
  "items": [{
    "id": "course-001",
    "title": "AI Security Foundations",
    "summary": "Introductory course on secure AI-assisted development.",
    "modality": "online",
    "status": "active",
    "tags": ["ai", "security"],
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-06-12T00:00:00.000Z"
  }],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

HTTP 400, for example `?pageSize=51`:

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [{"field": "pageSize", "message": "pageSize must be between 1 and 50."}]
  }
}
```

The sample uses twelve deterministic in-memory fixtures; no external service is required. See [the storage decision](decisions/0001-catalog-fixtures.md).

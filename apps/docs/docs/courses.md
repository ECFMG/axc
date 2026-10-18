# Course catalog

`GET /api/courses` searches a deterministic, local catalog of 12 courses.

| Query parameter | Meaning | Default |
| --- | --- | --- |
| q | Case-insensitive substring in title, summary, or any tag | Absent |
| modality | online, in-person, hybrid | Absent |
| status | draft, active, retired | Absent |
| tag | Case-insensitive exact tag | Absent |
| page | Positive safe integer, digits only | 1 |
| pageSize | Integer from 1 through 50, digits only | 10 |
| sort | title, createdAt, updatedAt; ascending | title |

Filters combine with AND. Text searches trim surrounding whitespace. Enum values are case-sensitive. Sort ties use id for stable pagination. Pagination happens after filtering and sorting. No matches return 200 with empty items and zero totalPages; a page past the end also returns empty items while retaining the matching totals.

Example: `/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title`

HTTP 200:

```json
{
  "items": [{
    "id": "course-001",
    "title": "AI Security Foundations",
    "summary": "Secure AI-assisted development.",
    "modality": "online",
    "status": "active",
    "tags": ["ai", "security"],
    "createdAt": "2025-12-15T00:00:00.000Z",
    "updatedAt": "2026-01-20T00:00:00.000Z"
  }],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

Invalid enum values, empty values, repeated parameters, unknown parameters, non-integer numbers, unsafe integers, or out-of-range pagination return HTTP 400. All detected problems are collected in details.

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [{ "field": "pageSize", "message": "pageSize must be between 1 and 50." }]
  }
}
```

The catalog is read-only sample data with no external service dependency. See [the storage decision](decisions/0001-course-catalog-fixtures.md).

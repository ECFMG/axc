# Course catalog search

`GET /api/courses` returns a paginated training catalog. All supplied filters are combined with AND. No matches and pages beyond the end return HTTP 200 with an empty `items` array.

| Parameter | Accepted input | Default |
| --- | --- | --- |
| `q` | Case-insensitive literal substring of title, summary, or any tag | Absent |
| `modality` | `online`, `in-person`, `hybrid` | All |
| `status` | `draft`, `active`, `retired` | All |
| `tag` | Case-insensitive exact tag | All |
| `page` | Positive safe whole number; the resulting offset must also be safe | `1` |
| `pageSize` | Whole number from 1 through 50 | `10` |
| `sort` | `title`, `createdAt`, `updatedAt` | `title` |

Values are trimmed; empty or whitespace-only values count as absent. Enum values are case-sensitive. Numeric values use decimal digits, without exponents, signs, or fractions. Unknown parameters are ignored. Sorting is ascending, with course ID as a stable tie breaker; title uses MongoDB's default binary ordering. Search text is literal, including regex punctuation.

Example: `/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title`.

## HTTP 200

```json
{
  "items": [
    {
      "id": "course-001",
      "title": "AI Security Foundations",
      "summary": "Secure AI-assisted development.",
      "modality": "online",
      "status": "active",
      "tags": ["ai", "security"],
      "createdAt": "2026-01-12T00:00:00.000Z",
      "updatedAt": "2026-06-01T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

Each item includes all eight fields shown. Dates are ISO strings. `totalItems` counts all matching records before pagination; `totalPages` is the ceiling of `totalItems / pageSize`, including zero for no matches.

## HTTP 400

Invalid query parameters return the same error envelope with details for each invalid field:

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [
      { "field": "pageSize", "message": "pageSize must be between 1 and 50." }
    ]
  }
}
```

## HTTP 500

Storage failures return a sanitized response:

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Unable to search courses."
  }
}
```

## Sample data and operation

The sample starts MongoDB 7.0.14 locally when no MongoDB URI is configured and seeds 12 courses with mixed modalities, statuses and tags. A MongoDB binary must already be cached or be downloadable on first use. Local data is discarded on shutdown. When `MONGODB_URI` is supplied, it connects to that database and does not seed it. No external integration is needed for tests.

See [the storage decision](../adr/0001-catalog-storage.md).

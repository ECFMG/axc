# Course catalog

`GET /api/courses` searches the sample training catalog. The API uses twelve in-memory fixtures and requires no database or external service.

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Query parameter | Behavior |
| --- | --- |
| `q` | Case-insensitive substring match in title, summary, or any tag. |
| `modality` | Exact enum: `online`, `in-person`, `hybrid`. |
| `status` | Exact enum: `draft`, `active`, `retired`. All statuses are included by default. |
| `tag` | Case-insensitive match of a complete tag. |
| `page` | Positive safe integer, default `1`. |
| `pageSize` | Integer from `1` to `50`, default `10`. |
| `sort` | `title` (default), `createdAt`, or `updatedAt`. Always ascending, with course ID breaking ties. |

Filters combine with AND. Search text and tags are trimmed. Empty or whitespace-only optional values are treated as absent. Enums are case-sensitive; surrounding whitespace on nonblank enum and numeric values is invalid. Numbers must contain decimal digits only, with no signs, fractions, exponents, or surrounding whitespace. Unknown and repeated query parameters are rejected.

Sorting uses deterministic string ordering; fixture timestamps are normalized ISO strings. Pagination happens after filtering and sorting. `totalItems` counts all matches; `totalPages` is the ceiling of that count divided by `pageSize`. A page beyond the last page returns an empty list while preserving the requested pagination and matching totals. No matches produce zero items and zero pages.

## Success response

HTTP `200`, `application/json`:

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
      "updatedAt": "2026-12-01T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

Every course includes a unique string `id`, `title`, `summary`, allowed `modality` and `status`, string-array `tags`, and ISO date strings `createdAt` and `updatedAt`.

## Error response

Invalid query parameters return HTTP `400`, `application/json`. All detected errors appear in `details` using the same envelope:

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

No matches return HTTP `200`:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 10,
  "totalItems": 0,
  "totalPages": 0
}
```

## Local example

```bash
curl -s 'http://localhost:7071/api/courses?q=security&modality=online&status=active'
```

The composition root supplies the fixture catalog to the persistence factory. The read repository owns filtering, sorting, and pagination; application services receive typed criteria; REST owns query validation and HTTP responses. Catalog data is read-only and resets with the process. There is no database-backed catalog in this sample.

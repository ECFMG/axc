# Course catalog

`GET /api/courses` searches a local, read-only catalog of 12 sample training courses. No external services or production data are required.

## Query parameters

| Parameter | Values and behavior | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring in title, summary, or any tag | No keyword filter |
| `modality` | `online`, `in-person`, `hybrid` | All modalities |
| `status` | `draft`, `active`, `retired` | All statuses |
| `tag` | Case-insensitive exact tag match | All tags |
| `page` | Positive decimal safe integer (1–9007199254740991) | `1` |
| `pageSize` | Decimal integer, 1–50 inclusive | `10` |
| `sort` | `title`, `createdAt`, `updatedAt` | `title` |

Filters combine with AND. Sorts are ascending, with course ID breaking ties. Titles use case-sensitive ordinal string ordering; ISO timestamps use chronological ordering. Filtering and sorting happen before pagination. `totalItems` counts all matching courses; `totalPages` is its ceiling divided by page size. No matches return 200 with empty `items` and zero totals. A page beyond the last page returns empty `items` while retaining the matching totals.

Empty or whitespace-only optional parameters are treated as omitted. Non-empty `q` and `tag` are trimmed. Enum values are case-sensitive. Numeric values must contain only decimal digits: signs, whitespace around numbers, fractions, exponents, overflow, and trailing characters are invalid. Unknown or repeated query parameters are invalid.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

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

Each course has a unique string ID, title, summary, modality, status, string-array tags, and ISO-string createdAt and updatedAt timestamps.

## Error response

`GET /api/courses?pageSize=51` returns HTTP 400, `application/json`:

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

All invalid query parameters use this envelope, with a field and reason in each detail.

## Implementation notes

The Catalog/Course domain owns shared types and values. Persistence provides an isolated in-memory fixture snapshot through a required read repository. Application services perform search, filters, sorting, and pagination on typed input. REST validates query strings and maps HTTP responses. The API composition root creates data sources once. This sample intentionally has no database persistence or catalog editing. Workspace dependencies and the repository's existing Vitest tooling connect the layers and enable colocated tests; no new third-party library was added.

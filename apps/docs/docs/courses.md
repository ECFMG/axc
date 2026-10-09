# Course catalog

`GET /api/courses` searches the sample training catalog. It uses an in-memory fixture of 12 courses and requires no external service. The catalog is read-only and resets with the process.

## Query parameters

| Parameter | Accepted values and behavior | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring in title, summary, or any tag | No keyword filter |
| `modality` | `online`, `in-person`, `hybrid` (case-sensitive) | All modalities |
| `status` | `draft`, `active`, `retired` (case-sensitive) | All statuses |
| `tag` | Case-insensitive exact match to any tag | No tag filter |
| `page` | Positive safe integer (1 through 9007199254740991), decimal digits only | `1` |
| `pageSize` | Integer from 1 through 50, decimal digits only | `10` |
| `sort` | `title`, `createdAt`, `updatedAt` | `title` |

Filters are combined with AND. Text filters are trimmed; empty or whitespace-only `q` and `tag` mean no filter. Unknown parameters and repeated parameters return 400. Empty enum or numeric parameters are invalid. Sorts are ascending with ID as the tie-breaker. Titles use locale-aware string ordering; dates use ISO string ordering. Filtering and sorting happen before pagination.

## Request and success response

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

HTTP 200:

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
      "createdAt": "2026-01-15T00:00:00.000Z",
      "updatedAt": "2026-06-01T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

`totalItems` counts all matches before pagination; `totalPages` is its ceiling divided by `pageSize`. No matches return HTTP 200 with `items: []`, `totalItems: 0`, and `totalPages: 0`. A page beyond the last page returns empty items and retains the matched totals.

## Validation error

```http
GET /api/courses?pageSize=51
```

HTTP 400:

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

All query validation errors share this shape, with a detail for each invalid field.

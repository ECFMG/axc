# Course catalog

`GET /api/courses` searches the sample training catalog. It uses 12 in-memory fixtures and requires no external data service.

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Parameter | Meaning | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring search in title, summary, or any tag | Omitted |
| `modality` | `online`, `in-person`, or `hybrid` | All |
| `status` | `draft`, `active`, or `retired` | All |
| `tag` | Case-insensitive whole-tag match | All |
| `page` | Positive safe integer, starting at 1 | `1` |
| `pageSize` | Integer from 1 through 50 | `10` |
| `sort` | `title`, `createdAt`, or `updatedAt` | `title` |

Filters combine with AND. Sort order is ascending, with course ID breaking ties; date fields are ISO timestamps. Text values are trimmed; empty or whitespace-only optional values are omitted. Enum values are case-sensitive. Numeric values must contain only decimal digits, without surrounding whitespace, signs, fractions, or exponents. Unknown and repeated query parameters return 400.

## Success response

HTTP `200`, `application/json`:

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
      "createdAt": "2026-01-15T00:00:00.000Z",
      "updatedAt": "2026-12-20T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

`totalItems` counts matching courses before pagination. `totalPages` is the ceiling of `totalItems / pageSize`. No matches return `items: []`, `totalItems: 0`, and `totalPages: 0`. A page past the last page returns an empty array with the matching totals preserved.

## Error response

`GET /api/courses?pageSize=51` returns HTTP `400`:

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

Multiple invalid fields can appear in `details`.

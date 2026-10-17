# Course catalog

`GET /api/courses` searches a deterministic sample catalog of 12 training courses. No external service is required.

## Query parameters

All parameters are optional. Filters combine with AND; results are filtered and sorted before pagination.

| Parameter | Values and behavior | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring in title, summary, or any tag | No keyword filter |
| `modality` | `online`, `in-person`, `hybrid` | All modalities |
| `status` | `draft`, `active`, `retired` | All statuses |
| `tag` | Case-insensitive exact match of a whole tag | All tags |
| `page` | Positive safe integer in decimal digits | `1` |
| `pageSize` | Integer from `1` through `50` | `10` |
| `sort` | `title`, `createdAt`, `updatedAt`, ascending; ties use id | `title` |

Enum values are case-sensitive. Unknown or repeated parameters are invalid. Empty `q` and `tag` apply no filter; empty enum and numeric parameters are invalid. Numeric notation such as fractions, exponents, signs, or spaces is invalid.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

## Success response

HTTP `200`:

```json
{
  "items": [
    {
      "id": "course-001",
      "title": "AI Security Foundations",
      "summary": "Introductory secure AI-assisted development.",
      "modality": "online",
      "status": "active",
      "tags": ["ai", "security"],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-12-15T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

`totalItems` counts all matching courses before pagination. `totalPages` is its ceiling divided by `pageSize`. No matches return HTTP `200`, `items: []`, `totalItems: 0`, and `totalPages: 0`. A page past the end returns an empty array and retains the matching totals. All course fields are required; timestamps are ISO date strings.

## Error response

Invalid parameters return HTTP `400` with field-specific details:

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

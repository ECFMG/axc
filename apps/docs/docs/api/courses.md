# Course search

`GET /api/courses` returns a page of training courses. The catalog is in-memory seed data with 12 courses. It resets when the API process restarts.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Parameter | Default | Rule |
| --- | --- | --- |
| `q` | none | Case-insensitive match against title, summary, or tags. |
| `modality` | none | `online`, `in-person`, or `hybrid`. |
| `status` | none | `draft`, `active`, or `retired`. |
| `tag` | none | Case-insensitive exact tag match. |
| `page` | `1` | Integer greater than or equal to 1. |
| `pageSize` | `10` | Integer from 1 to 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. Ascending. |

Filters combine with and. No matches return `200` and an empty `items` array. `totalPages` is `0` when `totalItems` is `0`.

## Success response

`200`

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

## Error response

Invalid query parameters return `400`.

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

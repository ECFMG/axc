# Course search

Search the training course catalog.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Query | Default | Rule |
| --- | --- | --- |
| `q` | omitted | Case-insensitive match on title, summary, or tags. Blank is invalid. |
| `modality` | omitted | `online`, `in-person`, or `hybrid`. |
| `status` | omitted | `draft`, `active`, or `retired`. |
| `tag` | omitted | Case-insensitive exact tag. Blank is invalid. |
| `page` | `1` | Integer from 1 to 10000. |
| `pageSize` | `10` | Integer from 1 to 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`, ascending. |

A course has `id`, `title`, `summary`, `modality`, `status`, `tags`, `createdAt`, and `updatedAt`. The catalog is a fixed in-memory fixture of 12 courses.

## Response

`200` returns a page. No matches are still `200` with `items: []`, `totalItems: 0`, and `totalPages: 0`.

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

Invalid parameters return `400`. Every invalid parameter is reported together.

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

## Example

`GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title` returns the AI Security Foundations course above.

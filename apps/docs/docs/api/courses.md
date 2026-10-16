# Course search

`GET /api/courses` searches the sample training catalog. All query parameters are optional.

| Parameter | Values | Default |
| --- | --- | --- |
| `q` | Case-insensitive text in title, summary, or tags | None |
| `modality` | `online`, `in-person`, `hybrid` | Any |
| `status` | `draft`, `active`, `retired` | Any |
| `tag` | Case-insensitive exact tag | Any |
| `page` | Positive integer | `1` |
| `pageSize` | Integer from 1 to 50 | `10` |
| `sort` | `title`, `createdAt`, `updatedAt`, ascending | `title` |

Example: `GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5`

Success (`200`):

```json
{
  "items": [{
    "id": "course-001",
    "title": "AI Security Foundations",
    "summary": "Secure AI-assisted development.",
    "modality": "online",
    "status": "active",
    "tags": ["ai", "security"],
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-06-01T00:00:00.000Z"
  }],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

Invalid or repeated query parameters return `400`:

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [{ "field": "pageSize", "message": "pageSize must be between 1 and 50." }]
  }
}
```

An empty match returns `200` with `items: []` and `totalPages: 0`. The catalog is an in-memory fixture of 12 courses.

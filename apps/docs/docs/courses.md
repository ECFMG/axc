# Course catalog

`GET /api/courses` searches the sample course catalog. It requires no authentication.

| Query parameter | Values | Default |
| --- | --- | --- |
| `q` | Case-insensitive text in title, summary, or tags | No search |
| `modality` | `online`, `in-person`, `hybrid` | All |
| `status` | `draft`, `active`, `retired` | All |
| `tag` | Case-insensitive exact tag | All |
| `page` | Positive integer | `1` |
| `pageSize` | Integer from 1 to 50 | `10` |
| `sort` | `title`, `createdAt`, `updatedAt` (ascending) | `title` |

Filters are combined with AND. Unknown, duplicate, empty text, and invalid values return 400.

## Example

```http
GET /api/courses?q=security&modality=online&status=active&page=1&pageSize=5
```

`200`:

```json
{
  "items": [
    {
      "id": "course-001",
      "title": "AI Security Foundations",
      "summary": "Secure AI-assisted development basics.",
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

No matches return `200` with `items: []`, `totalItems: 0`, and `totalPages: 0`.

`400`:

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [{ "field": "pageSize", "message": "pageSize must be between 1 and 50." }]
  }
}
```

# Course catalog

`GET /api/courses` searches the training course catalog. It requires no authentication in this sample application.

## Query parameters

| Parameter | Meaning |
| --- | --- |
| `q` | Case-insensitive substring search in title, summary, or tags. |
| `modality` | `online`, `in-person`, or `hybrid`. |
| `status` | `draft`, `active`, or `retired`. |
| `tag` | Case-insensitive exact tag match. |
| `page` | Positive integer, default `1`. |
| `pageSize` | Integer from `1` through `50`, default `10`. |
| `sort` | `title`, `createdAt`, or `updatedAt`; default `title`. All sorts are ascending. |

Parameters can be combined. Unknown or repeated parameters, empty `q` or `tag`, and invalid values return `400`.

## Example

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

`200` response:

```json
{
  "items": [{
    "id": "course-001",
    "title": "AI Security Foundations",
    "summary": "Introductory course on secure AI-assisted development.",
    "modality": "online",
    "status": "active",
    "tags": ["ai", "security"],
    "createdAt": "2026-01-15T00:00:00.000Z",
    "updatedAt": "2026-06-01T00:00:00.000Z"
  }],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

No matches return `200` with `items: []`, `totalItems: 0`, and `totalPages: 0`.

`400` response for `pageSize=51`:

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [{ "field": "pageSize", "message": "pageSize must be between 1 and 50." }]
  }
}
```

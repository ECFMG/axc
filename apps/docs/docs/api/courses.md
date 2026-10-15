# Course search

`GET /api/courses` returns a page of training courses from the sample catalog.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Parameter | Default | Rule |
| --- | --- | --- |
| `q` | none | Case-insensitive substring of `title`, `summary`, or any tag. |
| `modality` | none | `online`, `in-person`, or `hybrid`. |
| `status` | none | `draft`, `active`, or `retired`. |
| `tag` | none | Exact tag match, case-insensitive. |
| `page` | `1` | Integer greater than or equal to 1. |
| `pageSize` | `10` | Integer from 1 to 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. Ascending. |

Filters combine with AND. Unknown or empty parameters are invalid. The catalog is fixed sample data held in memory.

## Success

`200` with this JSON body:

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

No matches return `200` with `items: []`. `totalItems` is `0` and `totalPages` is `0`.

## Error

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

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&status=active"
```

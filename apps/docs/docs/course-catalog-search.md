# Course catalog search

`GET /api/courses` searches the training course catalog. Every parameter is optional.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Parameter | Values | Default | Behaviour |
| --- | --- | --- | --- |
| `q` | any text | — | Case-insensitive substring match on `title`, `summary` or any tag. |
| `modality` | `online`, `in-person`, `hybrid` | — | Exact match. |
| `status` | `draft`, `active`, `retired` | — | Exact match. |
| `tag` | any text | — | Course has this tag, case-insensitive. |
| `page` | integer ≥ 1 | `1` | 1-based page number. A page past the end returns empty `items`. |
| `pageSize` | integer 1–50 | `10` | Items per page. |
| `sort` | `title`, `createdAt`, `updatedAt` | `title` | Ascending; ties broken by `id`. |

Filters combine with AND. Any other parameter name is rejected.

## Success response

`200`, including when nothing matches (`items: []`, `totalItems: 0`, `totalPages: 0`).

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

| Field | Meaning |
| --- | --- |
| `items` | Courses on this page. |
| `page`, `pageSize` | The values applied (defaults filled in). |
| `totalItems` | Matches across all pages. |
| `totalPages` | `ceil(totalItems / pageSize)`. |

## Error response

`400` when any parameter is invalid. `details` lists every invalid parameter.

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
curl -s 'https://api.agentcourses.localhost/api/courses?tag=security&sort=updatedAt'
```

The catalog is an in-memory fixture of 14 courses (`packages/axc/persistence/src/course-seed.ts`); it resets when the API restarts.

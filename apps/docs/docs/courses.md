# Courses

`GET /api/courses` searches the training catalog. The catalog is a fixture of 14 courses held in memory by the API process; there is no database.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Parameter | Type | Default | Meaning |
| --- | --- | --- | --- |
| `q` | string | — | Case-insensitive keyword matched against `title`, `summary` and `tags`. |
| `modality` | `online` \| `in-person` \| `hybrid` | — | Exact modality filter. |
| `status` | `draft` \| `active` \| `retired` | — | Exact status filter. |
| `tag` | string | — | Matches a course carrying that tag, case-insensitively. |
| `page` | integer ≥ 1 | `1` | Page number. |
| `pageSize` | integer 1–50 | `10` | Items per page. |
| `sort` | `title` \| `createdAt` \| `updatedAt` | `title` | Ascending sort field. |

Blank values (`?tag=`) are treated as omitted filters.

## Response

`200` with a page of courses. A search with no matches returns `200` and an empty `items` array.

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
| `items` | Courses on the requested page. |
| `page` / `pageSize` | Echo of the effective pagination. |
| `totalItems` | Courses matching the filters across all pages. |
| `totalPages` | `ceil(totalItems / pageSize)`; `0` when nothing matches. |

## Errors

Any invalid `modality`, `status`, `page`, `pageSize` or `sort` value returns `400` with every offending parameter listed:

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [
      { "field": "pageSize", "message": "pageSize must be between 1 and 50." }
    ]
  }
}
```

## Example

```bash
curl -s 'https://api.agentcourses.localhost/api/courses?q=security&status=active&sort=createdAt'
```

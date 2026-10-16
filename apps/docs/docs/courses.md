# Courses

`GET /api/courses` searches the public agentCourses catalog. The route is query-only and does not require authentication.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Parameter | Default | Allowed values | Notes |
| --- | --- | --- | --- |
| `q` | unset | any string | Case-insensitive substring match against title, summary, and tags. Blank values are ignored. |
| `modality` | unset | `online`, `in-person`, `hybrid` | Exact match. |
| `status` | unset | `draft`, `active`, `retired` | Exact match. |
| `tag` | unset | any string | Case-insensitive exact tag equality. Blank values are ignored. |
| `page` | `1` | integer ≥ 1 | Page number after filtering and sorting. |
| `pageSize` | `10` | integer 1–50 | Maximum page size is 50. |
| `sort` | `title` | `title`, `createdAt`, `updatedAt` | `createdAt` and `updatedAt` are ISO-8601 strings. Equal values tie-break by `id`. |

Unknown query keys are ignored. Invalid `modality`, `status`, `page`, `pageSize`, or `sort` values return HTTP 400.

## Successful response

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

When no courses match, the response is still `200` with `items: []`, `totalItems: 0`, and `totalPages: 0`. Requests past the last page also return `200` with an empty `items` array and the correct totals.

## Error response

`400` when one or more query parameters are invalid:

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

`details` includes every invalid field.

## Example

```bash
curl -s 'https://api.agentcourses.localhost/api/courses?q=security&modality=online'
```

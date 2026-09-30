# Course catalog

`GET /api/courses` searches and filters the training course catalog. The sample catalog contains deterministic fixture data and does not require an external service.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

All query parameters are optional.

| Parameter | Meaning | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring search across `title`, `summary`, and every tag. | None |
| `modality` | Exact match: `online`, `in-person`, or `hybrid`. | None |
| `status` | Exact match: `draft`, `active`, or `retired`. | None |
| `tag` | Case-insensitive exact tag match. | None |
| `page` | Positive integer page number. | `1` |
| `pageSize` | Integer from 1 through 50. | `10` |
| `sort` | Ascending sort by `title`, `createdAt`, or `updatedAt`. | `title` |

Filters are combined with AND. Query parameters may each appear at most once. Empty `q` and `tag` values, unsupported parameters, invalid enum values, non-positive pages, and invalid page sizes produce the same validation-error envelope.

## Successful response

`200` with a page of courses and pagination metadata:

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

When no courses match, the endpoint still returns `200`; `items` is empty and both `totalItems` and `totalPages` are `0`.

## Validation error

Invalid query parameters return `400` with a detail for every validation failure:

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
curl -s 'https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active'
```

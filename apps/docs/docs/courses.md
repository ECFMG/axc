# Course catalog search

`GET /api/courses` searches the training course catalog. The catalog is an in-memory
fixture served by `@axc/application-services`; the route needs no database or external
service.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `q` | string | — | Case-insensitive substring match against `title`, `summary` and `tags`. |
| `modality` | enum | — | `online`, `in-person`, `hybrid`. |
| `status` | enum | — | `draft`, `active`, `retired`. |
| `tag` | string | — | Case-insensitive exact match against one of the course's tags. |
| `page` | integer | `1` | 1-based page number. |
| `pageSize` | integer | `10` | Between 1 and 50. |
| `sort` | enum | `title` | `title`, `createdAt` or `updatedAt`, ascending. |

Omitted or empty parameters are ignored. Filters combine with AND.

## Success response

`200` with a page of courses:

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
| `items` | Courses on the requested page, empty when nothing matches. |
| `page` / `pageSize` | Echo of the effective pagination. |
| `totalItems` | Courses matching the filters across all pages. |
| `totalPages` | `ceil(totalItems / pageSize)`; `0` when there are no matches. |

A search with no matches is a `200` with `"items": []`, not an error.

## Error response

`400` when any of `modality`, `status`, `sort`, `page` or `pageSize` is invalid. Every
invalid parameter is reported in one response:

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
curl -s "https://api.agentcourses.localhost/api/courses?tag=ai&sort=createdAt"
```

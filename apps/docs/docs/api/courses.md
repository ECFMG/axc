# Courses API

`GET /api/courses` searches the agentCourses training catalog. The catalog is read-only; courses
are seeded by `@axc/persistence` and are not created through the API.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

### Query parameters

Every parameter is optional. Blank values (`?q=`) are treated as omitted.

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `q` | string | — | Case-insensitive substring match against `title`, `summary`, and any `tag`. |
| `modality` | enum | — | `online`, `in-person`, or `hybrid`. |
| `status` | enum | — | `draft`, `active`, or `retired`. |
| `tag` | string | — | Case-insensitive exact match against one of the course's tags. |
| `page` | integer | `1` | 1-based page number. Must be a whole number of 1 or more. |
| `pageSize` | integer | `10` | Must be between 1 and 50. |
| `sort` | enum | `title` | `title`, `createdAt`, or `updatedAt`. Always ascending, with `id` as the tie-breaker. |

Filters combine with AND. Unrecognised query parameters are ignored.

## Course

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique course identifier. |
| `title` | string | Human-readable course title. |
| `summary` | string | Short description. |
| `modality` | enum | `online`, `in-person`, or `hybrid`. |
| `status` | enum | `draft`, `active`, or `retired`. Only `active` courses accept enrollment requests. |
| `tags` | string[] | Searchable tags. |
| `createdAt` | string | ISO-8601 date string. |
| `updatedAt` | string | ISO-8601 date string. |

## Success response

`200` with a paginated envelope:

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

A search that matches nothing returns `200` with `items: []`, `totalItems: 0`, and `totalPages: 0` —
not an error.

## Error response

An invalid query parameter returns `400` and lists every offending parameter at once:

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

| Scenario | Status | Code |
| --- | --- | --- |
| `modality`, `status`, or `sort` outside its allowed values | `400` | `INVALID_QUERY_PARAMETER` |
| `page` below 1 or not a whole number | `400` | `INVALID_QUERY_PARAMETER` |
| `pageSize` outside 1–50 or not a whole number | `400` | `INVALID_QUERY_PARAMETER` |

## Examples

```bash
curl -s 'https://api.agentcourses.localhost/api/courses?status=active&sort=createdAt'
curl -s 'https://api.agentcourses.localhost/api/courses?q=SECURITY&modality=online'
curl -s 'https://api.agentcourses.localhost/api/courses?tag=ai&page=1&pageSize=5'
```

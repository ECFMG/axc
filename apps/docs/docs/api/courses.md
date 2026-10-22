---
title: Course search
---

# Course search

`GET /api/courses` returns a page of training courses from the in-memory catalog.

## Request

```http
GET /api/courses?q=foundations&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

Query values are trimmed. Omit a parameter to leave that filter off.

| Parameter | Default | Rule |
| --- | --- | --- |
| `q` | none | Case-insensitive substring of `title`, `summary`, or any tag. |
| `modality` | none | `online`, `in-person`, or `hybrid`. |
| `status` | none | `draft`, `active`, or `retired`. |
| `tag` | none | Case-insensitive exact tag match. `sec` does not match `security`. |
| `page` | `1` | Integer greater than or equal to 1. |
| `pageSize` | `10` | Integer from 1 through 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. Ascending, then `id`. |

Filters combine with AND. Unknown names, empty values, repeated values, and values outside the lists above are invalid.

## Successful response

`200` with a page object. No matches is still `200`, with `items: []` and `totalPages: 0`.

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

The sample catalog ships with 12 courses. `course-001` is active and online. `course-004` is draft. `course-005` is retired.

## Error response

`400` when any query parameter is invalid. Every problem is listed in `details`.

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
curl -s "https://api.agentcourses.localhost/api/courses?q=foundations&modality=online&status=active&tag=ai"
```

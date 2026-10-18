---
id: courses
title: Course catalog
---

`GET /api/courses` searches twelve deterministic sample courses. No external services are required. Data is held in memory and is not a production catalog.

| Query parameter | Accepted values | Default |
| --- | --- | --- |
| `q` | Nonempty keyword, case-insensitive substring in title, summary, or any tag | Omitted |
| `modality` | `online`, `in-person`, `hybrid` | Omitted |
| `status` | `draft`, `active`, `retired` | Omitted |
| `tag` | Nonempty exact tag, case-insensitive | Omitted |
| `page` | Positive safe integer, digits only | `1` |
| `pageSize` | Integer from 1 through 50, digits only | `10` |
| `sort` | `title`, `createdAt`, `updatedAt` | `title` |

Filters combine with AND. Keyword and tag values are trimmed. Enum values are case-sensitive. Sorting is ascending, before pagination, with course id as the tie breaker. Dates use ISO strings. Totals count all filtered matches before pagination. An out-of-range page returns empty items and preserves the totals. No matches return HTTP 200 with `totalItems: 0` and `totalPages: 0`.

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

HTTP 200:

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
    "updatedAt": "2026-12-20T00:00:00.000Z"
  }],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

Invalid enum values, empty values, repeated parameters, unknown parameters, noninteger numbers, unsafe integers, and numbers outside the allowed ranges return HTTP 400. All detected errors are collected in `details`. Example: `GET /api/courses?pageSize=51`:

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [{ "field": "pageSize", "message": "pageSize must be between 1 and 50." }]
  }
}
```

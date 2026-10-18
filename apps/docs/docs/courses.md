---
id: courses
title: Course catalog API
---

`GET /api/courses` searches the 12 seeded sample courses. Filters combine with AND. No authentication is required in this sample.

| Parameter | Values and behavior |
| --- | --- |
| `q` | Case-insensitive substring across title, summary, and tags |
| `modality` | `online`, `in-person`, `hybrid` |
| `status` | `draft`, `active`, `retired`; omitted means all statuses |
| `tag` | Case-insensitive exact tag match |
| `page` | Positive safe integer, default 1 |
| `pageSize` | Integer 1–50, default 10 |
| `sort` | `title` (default), `createdAt`, `updatedAt`; ascending, ID breaks ties |

Blank, repeated, unknown, invalid enum, non-integer, and unsafe integer parameters return 400. Text search is trimmed. Pagination beyond the last page succeeds with an empty list.

Example: `GET /api/courses?q=security&modality=online&status=active&page=1&pageSize=1&sort=title`.

200 response:

```json
{
  "items": [{
    "id": "course-001",
    "title": "AI Security Foundations",
    "summary": "Practical training for modern development teams.",
    "modality": "online",
    "status": "active",
    "tags": ["ai", "security"],
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-06-12T00:00:00.000Z"
  }],
  "page": 1,
  "pageSize": 1,
  "totalItems": 2,
  "totalPages": 2
}
```

No matches returns `items: []`, `totalItems: 0`, and `totalPages: 0`.

400 response:

```json
{"error":{"code":"INVALID_QUERY_PARAMETER","message":"One or more query parameters are invalid.","details":[{"field":"pageSize","message":"pageSize must be between 1 and 50."}]}}
```

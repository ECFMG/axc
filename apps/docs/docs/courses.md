---
id: courses
title: Course catalog search
---

# `GET /api/courses`

Searches the training course catalog. Anonymous; served from an in-memory seed of 12 courses.

## Query parameters

| Name | Type | Default | Rules |
| --- | --- | --- | --- |
| `q` | string | — | Case-insensitive substring match on `title`, `summary`, or any tag |
| `modality` | enum | — | `online`, `in-person`, `hybrid` |
| `status` | enum | — | `draft`, `active`, `retired` |
| `tag` | string | — | Case-insensitive exact tag match |
| `page` | integer | `1` | ≥ 1 |
| `pageSize` | integer | `10` | 1–50 |
| `sort` | enum | `title` | `title`, `createdAt`, `updatedAt` (ascending, ties by `id`) |

Filters combine with AND. Unknown parameters are rejected.

## Success — 200

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

No matches return 200 with `"items": []`, `totalItems: 0`, `totalPages: 0`.

## Error — 400

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [{ "field": "pageSize", "message": "pageSize must be between 1 and 50." }]
  }
}
```

`details` holds one entry per invalid parameter.

## Example

```bash
curl 'http://localhost:7071/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title'
```

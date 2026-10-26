---
id: courses
title: Course search
---

# `GET /api/courses`

Searches the course catalog. All parameters are optional.

| Parameter | Values | Default | Notes |
| --- | --- | --- | --- |
| `q` | text | — | Case-insensitive match on title, summary or tags |
| `modality` | `online`, `in-person`, `hybrid` | — | Exact |
| `status` | `draft`, `active`, `retired` | — | Exact |
| `tag` | text | — | Case-insensitive exact tag match |
| `page` | integer ≥ 1 | `1` | |
| `pageSize` | integer 1–50 | `10` | |
| `sort` | `title`, `createdAt`, `updatedAt` | `title` | Ascending |

## 200 response

```json
{
  "items": [
    {
      "id": "course-003",
      "title": "AI Security Essentials",
      "summary": "Threats and defenses for AI systems.",
      "modality": "online",
      "status": "active",
      "tags": ["ai", "security"],
      "createdAt": "2026-01-01T09:00:00.000Z",
      "updatedAt": "2026-01-25T09:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

No match returns `200` with `"items": []`.

## 400 response

Any invalid `modality`, `status`, `page`, `pageSize` or `sort`; one `details` entry per bad field.

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [{ "field": "pageSize", "message": "pageSize must be between 1 and 50." }]
  }
}
```

```bash
curl 'http://localhost:7071/api/courses?q=security&modality=online&status=active&page=1&pageSize=5&sort=title'
```

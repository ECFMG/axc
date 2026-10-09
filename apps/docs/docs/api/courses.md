# Courses API

`GET /api/courses` searches the sample catalog. No request body is required.

| Query | Meaning |
| --- | --- |
| `q` | Case-insensitive substring of title, summary, or a tag |
| `modality` | `online`, `in-person`, or `hybrid` |
| `status` | `draft`, `active`, or `retired` |
| `tag` | Case-insensitive exact tag |
| `page` | Positive integer, default `1` |
| `pageSize` | Integer 1–50, default `10` |
| `sort` | `title`, `createdAt`, or `updatedAt`; default `title`, ascending |

**200:** `{ "items": [{ "id": "course-001", "title": "AI Security Foundations", "summary": "Secure AI-assisted development", "modality": "online", "status": "active", "tags": ["ai", "security"], "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z" }], "page": 1, "pageSize": 10, "totalItems": 1, "totalPages": 1 }`. An empty result has `items: []` and `totalPages: 0`.

**400 `INVALID_QUERY_PARAMETER`:** Unknown, repeated, or invalid query parameters. Response shape: `{ "error": { "code": "INVALID_QUERY_PARAMETER", "message": "One or more query parameters are invalid.", "details": [{ "field": "pageSize", "message": "pageSize must be between 1 and 50." }] } }`.

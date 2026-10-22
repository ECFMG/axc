# Course search

`GET /api/courses` returns HTTP 200 with `{ items, page, pageSize, totalItems, totalPages }`.
Each course has `id`, `title`, `summary`, `modality`, `status`, `tags`, `createdAt`, and `updatedAt` (ISO timestamps).
The sample catalog contains twelve courses across all modalities and statuses.

| Query | Behavior |
| --- | --- |
| `q` | Case insensitive substring of title, summary, or any tag |
| `modality` | `online`, `in-person`, `hybrid` |
| `status` | `draft`, `active`, `retired` |
| `tag` | Case insensitive exact tag |
| `page` | Positive safe integer; default 1 |
| `pageSize` | Integer 1–50; default 10 |
| `sort` | `title` (default), `createdAt`, `updatedAt`; ascending with ID tie break |

Filters combine with AND. Example: `/api/courses?q=security&modality=online&status=active&pageSize=5`.
No matches returns HTTP 200 with `items: []`, `totalItems: 0`, `totalPages: 0`.
Pages beyond the last page have empty items and preserve total metadata.

```json
{"items":[{"id":"course-001","title":"AI Security Foundations","summary":"Introductory course on secure AI-assisted development.","modality":"online","status":"active","tags":["ai","security"],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-12-15T00:00:00.000Z"}],"page":1,"pageSize":5,"totalItems":1,"totalPages":1}
```

Invalid enums, empty values, unknown or repeated parameters, non-digit integers, unsafe integers, and range violations return HTTP 400:

```json
{"error":{"code":"INVALID_QUERY_PARAMETER","message":"One or more query parameters are invalid.","details":[{"field":"pageSize","message":"pageSize must be between 1 and 50."}]}}
```

# Course search

`GET /api/courses` returns `{ items, page, pageSize, totalItems, totalPages }`. Each item has `id`, `title`, `summary`, `modality`, `status`, `tags`, `createdAt`, and `updatedAt`.

| Query | Values | Default |
| --- | --- | --- |
| `q` | Case insensitive text in title, summary, or tags | none |
| `modality` | `online`, `in-person`, `hybrid` | all |
| `status` | `draft`, `active`, `retired` | all |
| `tag` | Case insensitive exact tag | all |
| `page` | Positive integer | 1 |
| `pageSize` | 1–50 | 10 |
| `sort` | `title`, `createdAt`, `updatedAt` | `title` |

Example: `GET /api/courses?q=security&status=active&page=1&pageSize=5` returns HTTP 200:

```json
{"items":[{"id":"course-001","title":"AI Security Foundations","summary":"AI Security Foundations practical training for professionals.","modality":"online","status":"active","tags":["ai","security"],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-06-01T00:00:00.000Z"}],"page":1,"pageSize":5,"totalItems":1,"totalPages":1}
```

Invalid query values return HTTP 400 with `INVALID_QUERY_PARAMETER` and field details:

```json
{"error":{"code":"INVALID_QUERY_PARAMETER","message":"One or more query parameters are invalid.","details":[{"field":"pageSize","message":"pageSize must be between 1 and 50."}]}}
```

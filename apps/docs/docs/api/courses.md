# Course search

`GET /api/courses` returns a paginated catalog. Each course has `id`, `title`, `summary`, `modality` (`online`, `in-person`, `hybrid`), `status` (`draft`, `active`, `retired`), `tags`, `createdAt`, and `updatedAt`.

| Query | Behavior |
| --- | --- |
| `q` | Case-insensitive substring match in title, summary, or tags. |
| `modality`, `status` | Exact enum filters. |
| `tag` | Case-insensitive exact tag. |
| `page` | Positive integer, default 1. |
| `pageSize` | 1–50, default 10. |
| `sort` | `title`, `createdAt`, or `updatedAt`; default `title`, ascending. |

Example: `GET /api/courses?q=security&status=active&page=1&pageSize=5`.

Successful response (`200`):

```json
{"items":[{"id":"course-001","title":"AI Security Foundations","summary":"Training in ai security foundations for working professionals.","modality":"online","status":"active","tags":["ai","security"],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-06-01T00:00:00.000Z"}],"page":1,"pageSize":5,"totalItems":1,"totalPages":1}
```

Invalid query values return `400` with `error.code = "INVALID_QUERY_PARAMETER"` and field-level `details`.

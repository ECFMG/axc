# Course search

`GET /api/courses` searches the local sample catalog. No authentication is required.

| Query | Meaning |
| --- | --- |
| `q` | Case-insensitive text in title, summary, or tags. |
| `modality` | `online`, `in-person`, or `hybrid`. |
| `status` | `draft`, `active`, or `retired`. |
| `tag` | Case-insensitive exact tag. |
| `page` | Positive integer; default 1. |
| `pageSize` | Integer from 1 to 50; default 10. |
| `sort` | `title`, `createdAt`, or `updatedAt`; default `title`, ascending. |

A successful response is HTTP 200 and contains `items`, `page`, `pageSize`, `totalItems`, and `totalPages`. Each item has `id`, `title`, `summary`, `modality`, `status`, `tags`, `createdAt`, and `updatedAt`. A search without matches has an empty `items` array and zero totals.

```http
GET /api/courses?q=security&status=active&tag=ai&page=1&pageSize=5
```

```json
{"items":[{"id":"course-001","title":"AI Security Foundations","summary":"Introductory course on secure AI-assisted development.","modality":"online","status":"active","tags":["ai","security"],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-06-01T00:00:00.000Z"}],"page":1,"pageSize":5,"totalItems":1,"totalPages":1}
```

Invalid or unknown query parameters return HTTP 400 with code `INVALID_QUERY_PARAMETER` and field details.

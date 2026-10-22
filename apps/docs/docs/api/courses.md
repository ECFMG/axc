# Course search

## GET /api/courses

Searches the sample catalog. Query parameters are optional: `q` searches title, summary, and tags without case sensitivity; `modality` is `online`, `in-person`, or `hybrid`; `status` is `draft`, `active`, or `retired`; `tag` matches a tag without case sensitivity. `page` defaults to 1 and must be a positive integer. `pageSize` defaults to 10 and is limited to 1–50. `sort` is `title` (default), `createdAt`, or `updatedAt`, ascending.

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

### Success: 200

```json
{"items":[{"id":"course-001","title":"AI Security Foundations","summary":"Introductory course on secure AI-assisted development.","modality":"online","status":"active","tags":["ai","security"],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-06-01T00:00:00.000Z"}],"page":1,"pageSize":5,"totalItems":1,"totalPages":1}
```

### Errors

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_QUERY_PARAMETER` | Unknown, repeated, or invalid query parameter. |

```json
{"error":{"code":"INVALID_QUERY_PARAMETER","message":"One or more query parameters are invalid.","details":[{"field":"pageSize","message":"pageSize must be between 1 and 50."}]}}
```

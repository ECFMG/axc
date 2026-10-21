# Courses

`GET /api/courses` searches the training course catalog. It supports keyword search, filters, pagination, and sorting.

The catalog is served from an in-memory seed of 14 courses (`@axc/persistence`), so the endpoint needs no external services.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

All query parameters are optional. Each may appear at most once.

| Parameter | Type | Default | Rules |
| --- | --- | --- | --- |
| `q` | string | none | Keyword, 1 to 100 characters after trimming. Matches courses whose `title`, `summary`, or any tag contains it, ignoring case. |
| `modality` | enum | none | One of `online`, `in-person`, `hybrid`. Exact, lower-case value. |
| `status` | enum | none | One of `draft`, `active`, `retired`. Exact, lower-case value. |
| `tag` | string | none | 1 to 100 characters after trimming. Matches courses that have this tag, ignoring case. The whole tag must match (`ai` does not match `airflow`). |
| `page` | integer | `1` | Whole number of 1 or more. A page past the last one returns an empty `items` array. |
| `pageSize` | integer | `10` | Whole number from 1 to 50. |
| `sort` | enum | `title` | One of `title`, `createdAt`, `updatedAt`. Always ascending (A to Z, oldest first). Ties are ordered by `id`. |

Filters combine with AND: a course must satisfy every parameter supplied.

## Success response

`200` with this JSON body:

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

| Field | Meaning |
| --- | --- |
| `items` | Courses on the requested page. Empty when nothing matches. |
| `page` | The requested page. |
| `pageSize` | The requested page size. |
| `totalItems` | Number of courses matching the filters, across all pages. |
| `totalPages` | `ceil(totalItems / pageSize)`. `0` when nothing matches. |

A search with no matches is not an error. It returns `200` with `"items": []`, `"totalItems": 0` and `"totalPages": 0`.

### Course fields

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique course ID |
| `title` | string | Course title |
| `summary` | string | Short description |
| `modality` | enum | `online`, `in-person`, `hybrid` |
| `status` | enum | `draft`, `active`, `retired` |
| `tags` | string[] | Searchable tags |
| `createdAt` | string | ISO-8601 date |
| `updatedAt` | string | ISO-8601 date |

## Error response

Any invalid query parameter returns `400`. Every invalid parameter is listed in `details`, not only the first one.

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [
      {
        "field": "pageSize",
        "message": "pageSize must be between 1 and 50."
      }
    ]
  }
}
```

A parameter is invalid when:

- `modality`, `status`, or `sort` is not one of the allowed values.
- `page` or `pageSize` is not a whole number in range (for example `0`, `-1`, `1.5`, `abc`, or `pageSize=51`).
- `q` or `tag` is empty or longer than 100 characters.
- The same parameter appears more than once.
- The parameter name is not one listed above.

## Examples

```bash
curl -s 'https://api.agentcourses.localhost/api/courses'
curl -s 'https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active'
curl -s 'https://api.agentcourses.localhost/api/courses?tag=AI&sort=createdAt&page=1&pageSize=5'
```

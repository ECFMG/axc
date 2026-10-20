# Course catalog

`GET /api/courses` searches the built-in training course catalog. The route is anonymous, the same way `GET /health` is. Results come from the in-memory seed in `@axc/persistence`. The process does not read a database.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

All query parameters are optional. Filters that are present are combined with AND. Text values are trimmed.

| Parameter | Default | Rule |
| --- | --- | --- |
| `q` | none | Case-insensitive substring match against `title`, `summary`, and any tag. A blank value is ignored. |
| `modality` | none | `online`, `in-person`, or `hybrid`. |
| `status` | none | `draft`, `active`, or `retired`. |
| `tag` | none | Exact tag match, case-insensitive. A blank value is ignored. `ai` matches tag `AI` and does not match `ai-safety`. |
| `page` | `1` | Integer greater than or equal to 1. No leading zeros. |
| `pageSize` | `10` | Integer from 1 through 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. Sort is ascending. Equal values are ordered by `id`. |

Unknown query parameters, repeated parameters, and values outside those rules return HTTP 400. Enum values are case-sensitive. `q` and `tag` are not.

A page past the last page returns HTTP 200 with an empty `items` array and the requested page metadata. No matches do the same, with `totalItems` 0 and `totalPages` 0.

## Success response

HTTP 200:

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
| `items` | Courses on this page, in sort order. |
| `page` | Requested page, after the default is applied. |
| `pageSize` | Requested page size, after the default is applied. |
| `totalItems` | Number of courses that match the filters, before paging. |
| `totalPages` | `ceil(totalItems / pageSize)`, or `0` when nothing matches. |

`createdAt` and `updatedAt` are ISO-8601 timestamps.

The sample catalog contains 15 courses. `GET /api/courses` with no query returns the first 10 by title. `course-001` is the documented record above. `q=security&modality=online&status=active` matches that record only.

## Error response

HTTP 400:

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

`details` lists every problem. Known fields are reported in this order: `q`, `modality`, `status`, `tag`, `page`, `pageSize`, `sort`. Unknown fields follow, sorted by name.

| Field | Message |
| --- | --- |
| `modality` | `modality must be one of online, in-person, hybrid.` |
| `status` | `status must be one of draft, active, retired.` |
| `page` | `page must be an integer greater than or equal to 1.` |
| `pageSize` | `pageSize must be between 1 and 50.` |
| `sort` | `sort must be one of title, createdAt, updatedAt.` |
| any repeated field | `<field> must be provided once.` |
| any unknown field | `Unknown query parameter.` |

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active"
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`.

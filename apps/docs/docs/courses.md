# Course catalog

`GET /api/courses` searches the training course catalog served by `@axc/rest`. `@apps/api` registers the route. The catalog is an in-memory fixture of 14 courses with mixed modality, status, and tags. It is not stored in a database.

Filters that are present are combined. Every comparison that uses text is defined below. Sort order is ascending.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Query parameter | Default | Rule |
| --- | --- | --- |
| `q` | omitted | Case-insensitive substring match against `title`, `summary`, or any tag. A blank value is ignored. |
| `modality` | omitted | `online`, `in-person`, or `hybrid`. The value must match exactly. |
| `status` | omitted | `draft`, `active`, or `retired`. The value must match exactly. |
| `tag` | omitted | Case-insensitive match against a whole tag. A blank value is invalid. |
| `page` | `1` | Integer greater than or equal to 1. |
| `pageSize` | `10` | Integer from 1 through 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. Ascending. `title` is compared in English, ignoring case. Dates are ISO-8601 timestamps, so ascending text order is chronological order. |

Leading and trailing whitespace is removed before a value is validated. Any other query parameter is invalid.

A page past the last page returns `200` and an empty `items` array. `totalItems` and `totalPages` still describe the filtered set. `totalPages` is `0` when `totalItems` is `0`.

## Successful response

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
| `items` | Courses on this page. Empty when nothing matches. |
| `page` | Page number that was applied. |
| `pageSize` | Page size that was applied. |
| `totalItems` | Number of courses that match before pagination. |
| `totalPages` | `0` when `totalItems` is `0`, otherwise `ceil(totalItems / pageSize)`. |

| Course field | Meaning |
| --- | --- |
| `id` | Unique course ID. |
| `title` | Course title. |
| `summary` | Short description. |
| `modality` | `online`, `in-person`, or `hybrid`. |
| `status` | `draft`, `active`, or `retired`. |
| `tags` | Searchable tags. |
| `createdAt` | ISO-8601 creation time. |
| `updatedAt` | ISO-8601 update time. |

The request in the example matches one fixture course, `course-001`.

No match:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 10,
  "totalItems": 0,
  "totalPages": 0
}
```

## Error response

Invalid query parameters return `400` with this JSON body:

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

| Detail field | Message |
| --- | --- |
| `modality` | `modality must be one of online, in-person, hybrid.` |
| `status` | `status must be one of draft, active, retired.` |
| `tag` | `tag must be a non-empty string.` |
| `page` | `page must be an integer greater than or equal to 1.` |
| `pageSize` | `pageSize must be between 1 and 50.` |
| `sort` | `sort must be one of title, createdAt, updatedAt.` |
| any other name | `<name> is not a supported query parameter.` |

When several parameters are invalid, `details` lists `modality`, `status`, `tag`, `page`, `pageSize`, and `sort` first, then unsupported names in alphabetical order.

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`. A git worktree named `feature-a` uses `https://api.agentcourses.feature-a.localhost` when `WORKTREE_NAME=feature-a`.

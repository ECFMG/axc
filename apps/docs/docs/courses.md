# Course catalog

`GET /api/courses` searches the training course catalog. `@axc/rest` serves the route, `@axc/application-services` applies the query, and `@axc/persistence` holds a fixed in-memory fixture of 13 courses.

Filters combine with AND. `q` and `tag` are case-insensitive. `modality`, `status`, and `sort` must match the allowed values exactly. Sort order is ascending.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

## Query parameters

| Name | Default | Rule |
| --- | --- | --- |
| `q` | omitted | Substring match against `title`, `summary`, or any tag. Blank values are ignored. |
| `modality` | omitted | `online`, `in-person`, or `hybrid`. |
| `status` | omitted | `draft`, `active`, or `retired`. |
| `tag` | omitted | Exact tag match after trimming, ignoring case. |
| `page` | `1` | Integer greater than or equal to 1. |
| `pageSize` | `10` | Integer from 1 through 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. |

A page past the last page returns an empty `items` array and the same totals. `totalPages` is `0` when `totalItems` is `0`.

Repeated parameters and parameter names outside this table are invalid.

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
| `items` | Courses on this page, in sort order. |
| `page` | Page number that was applied. |
| `pageSize` | Page size that was applied. |
| `totalItems` | Courses that matched before pagination. |
| `totalPages` | `0` when nothing matched, otherwise `ceil(totalItems / pageSize)`. |

## Error response

Invalid `modality`, `status`, `tag`, `page`, `pageSize`, or `sort` values, repeated parameters, and unknown parameters return `400`:

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

## No matches

A query that matches nothing returns `200`, not an error:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 10,
  "totalItems": 0,
  "totalPages": 0
}
```

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`. A git worktree named `feature-a` uses `https://api.agentcourses.feature-a.localhost` when `WORKTREE_NAME=feature-a`.

The catalog fixture and the choice to keep it in memory are recorded in [Course catalog search](./decisions/course-catalog-search.md).

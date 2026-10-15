# Course catalog

`GET /api/courses` searches the training course catalog composed by `@apps/api`. The catalog is an in-memory fixture of 12 courses. Keyword search and tag matching are case-insensitive. Filters combine, and results are paginated.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Query parameter | Default | Meaning |
| --- | --- | --- |
| `q` | none | Case-insensitive substring match against `title`, `summary`, or any tag. A blank value applies no keyword filter. |
| `modality` | none | `online`, `in-person`, or `hybrid`. |
| `status` | none | `draft`, `active`, or `retired`. |
| `tag` | none | Case-insensitive exact tag match. A blank value applies no tag filter. |
| `page` | `1` | 1-based page number. |
| `pageSize` | `10` | Page size from 1 through 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. Sort order is ascending. Equal keys are ordered by `id`. |

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
| `items` | Courses on this page. Empty when nothing matches or the page is past the end. |
| `page` | Requested page, or `1` when `page` is omitted. |
| `pageSize` | Requested page size, or `10` when `pageSize` is omitted. |
| `totalItems` | Number of courses that match before pagination. |
| `totalPages` | `0` when `totalItems` is `0`, otherwise `ceil(totalItems / pageSize)`. |

A request that matches nothing returns `200` and an empty `items` array.

## Error response

Invalid `modality`, `status`, `page`, `pageSize`, or `sort` values return `400`:

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

When several parameters are invalid, `details` includes one entry for each of them.

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active"
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`. A git worktree named `feature-a` uses `https://api.agentcourses.feature-a.localhost` when `WORKTREE_NAME=feature-a`.

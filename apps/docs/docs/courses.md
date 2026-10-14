# Course catalog

`GET /api/courses` searches the training course catalog composed by `@apps/api`.

The catalog is a fixed in-memory fixture of 12 courses. See [the catalog decision](adr/0001-in-memory-course-catalog.md).

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Query | Default | Rule |
| --- | --- | --- |
| `q` | none | Case-insensitive substring match against `title`, `summary`, and `tags`. |
| `modality` | none | `online`, `in-person`, or `hybrid`. |
| `status` | none | `draft`, `active`, or `retired`. |
| `tag` | none | Case-insensitive exact tag match. |
| `page` | `1` | Integer greater than or equal to 1. |
| `pageSize` | `10` | Integer from 1 through 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. Ascending. |

Filters combine with AND. Blank parameters are ignored. `page`, `pageSize`, and `sort` fall back to their defaults when omitted. A page past the end of the result returns an empty `items` array and still reports `totalItems`.

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
| `items` | Courses for this page. Empty when nothing matches. |
| `page` | Requested page, after the default is applied. |
| `pageSize` | Requested page size, after the default is applied. |
| `totalItems` | Matches before pagination. |
| `totalPages` | `0` when `totalItems` is `0`, otherwise `ceil(totalItems / pageSize)`. |

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

Every invalid parameter is listed in `details`. A query that matches nothing is not an error.

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active"
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`. A git worktree named `feature-a` uses `https://api.agentcourses.feature-a.localhost` when `WORKTREE_NAME=feature-a`.

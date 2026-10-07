# Course catalog

`GET /api/courses` searches the training course catalog. The API reads a seeded in-memory catalog, so the endpoint does not call an external service.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Query parameter | Default | Rules |
| --- | --- | --- |
| `q` | none | Case-insensitive substring match against `title`, `summary`, and `tags`. Blank values are ignored. |
| `modality` | none | `online`, `in-person`, or `hybrid`. |
| `status` | none | `draft`, `active`, or `retired`. |
| `tag` | none | Case-insensitive exact tag match. Must be non-empty when present. |
| `page` | `1` | Integer greater than or equal to 1. |
| `pageSize` | `10` | Integer from 1 through 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. Sort order is ascending. |

Filters combine with AND. `modality`, `status`, and `sort` are case-sensitive. Each parameter may be sent once. Any other query parameter is invalid.

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
| `items` | Courses on the requested page. Empty when nothing matches or the page is past the end. |
| `page` | Requested page, including the default. |
| `pageSize` | Requested page size, including the default. |
| `totalItems` | Matching courses before pagination. |
| `totalPages` | `0` when `totalItems` is `0`. Otherwise `totalItems` divided by `pageSize`, rounded up. |

A request that matches nothing returns `200` and an empty `items` array. It is not an error.

## Error response

Invalid query parameters return `400`:

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

`details` lists every invalid parameter on the request.

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`. A git worktree named `feature-a` uses `https://api.agentcourses.feature-a.localhost` when `WORKTREE_NAME=feature-a`.

The seeded catalog contains 13 courses with mixed modality, status, and tags. The example request matches `course-001` only.

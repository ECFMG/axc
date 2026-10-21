# Course catalog

`GET /api/courses` searches the training course catalog composed by `@apps/api`.

The catalog is an in-memory seed of 12 courses created when the API process starts. It mixes `online`, `in-person`, and `hybrid` modalities, `draft`, `active`, and `retired` statuses, and several tags. Restarting the process restores that seed. The route does not write courses.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Query parameter | Default | Rule |
| --- | --- | --- |
| `q` | omitted | Case-insensitive substring of `title`, `summary`, or any tag. A blank value is ignored. |
| `modality` | omitted | `online`, `in-person`, or `hybrid`. |
| `status` | omitted | `draft`, `active`, or `retired`. |
| `tag` | omitted | Case-insensitive exact tag. A blank value is ignored. |
| `page` | `1` | Integer greater than or equal to 1. |
| `pageSize` | `10` | Integer from 1 through 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. Sort order is ascending, with `id` as the tie-breaker. |

Filters combine with AND. Values are trimmed. `modality`, `status`, and `sort` must match the allowed values exactly after trimming. Unknown or repeated query parameters are invalid.

## Success response

`200` with this JSON body. A query that matches nothing is still `200`, with `items` empty, `totalItems` `0`, and `totalPages` `0`. A page past the last page is `200` with `items` empty and the requested `page`.

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
| `page` | Requested page, after applying the default. |
| `pageSize` | Requested page size, after applying the default. |
| `totalItems` | Courses that match before pagination. |
| `totalPages` | `0` when `totalItems` is `0`, otherwise `ceil(totalItems / pageSize)`. |

## Error response

`400` when a query parameter is unknown, repeated, or not one of the allowed values:

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

Every invalid parameter is listed in `details`. `field` is the query parameter name.

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`. A git worktree named `feature-a` uses `https://api.agentcourses.feature-a.localhost` when `WORKTREE_NAME=feature-a`.

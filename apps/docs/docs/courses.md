# Course catalog

`GET /api/courses` searches the training course catalog composed by `@apps/api`. The host serves a built-in catalog of 12 courses, so the route does not call an external database.

Filters combine with AND. Keyword search is a case-insensitive substring match. The tag filter is a case-insensitive exact match. `modality`, `status`, and `sort` are case-sensitive. Unknown query parameters are ignored. Sort order is ascending, with `id` as the tie-breaker.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Parameter | Default | Rule |
| --- | --- | --- |
| `q` | omitted | Case-insensitive substring of `title`, `summary`, or any tag. An empty value applies no keyword filter. |
| `modality` | omitted | `online`, `in-person`, or `hybrid`. |
| `status` | omitted | `draft`, `active`, or `retired`. |
| `tag` | omitted | Case-insensitive exact tag. Must be non-empty when present. |
| `page` | `1` | Integer greater than or equal to 1. |
| `pageSize` | `10` | Integer from 1 through 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. |

Each parameter may be provided once.

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
| `items` | Courses on this page. Empty when nothing matches or the page is past the end. |
| `page` | Requested page, or `1` when omitted. |
| `pageSize` | Requested page size, or `10` when omitted. |
| `totalItems` | Number of courses that match the filters. |
| `totalPages` | `0` when `totalItems` is `0`, otherwise `totalItems` divided by `pageSize`, rounded up. |

A query that matches nothing returns `200` with `"items": []`.

## Error response

Invalid `modality`, `status`, `tag`, `page`, `pageSize`, or `sort` values return `400`:

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

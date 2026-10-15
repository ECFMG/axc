# Course catalog

`GET /api/courses` searches the training course catalog composed by `@apps/api`.

Filters combine with AND. Keyword and tag matching are case-insensitive. Sort order is ascending, with `id` as the tie break. The catalog is a fixed fixture of 13 courses.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Query parameter | Default | Rule |
| --- | --- | --- |
| `q` | omitted | Substring of `title`, `summary`, or any tag. A blank value applies no keyword filter. |
| `modality` | omitted | `online`, `in-person`, or `hybrid`. |
| `status` | omitted | `draft`, `active`, or `retired`. |
| `tag` | omitted | Exact tag match. Must not be blank when present. |
| `page` | `1` | Integer greater than or equal to 1. |
| `pageSize` | `10` | Integer from 1 through 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. |

Any other query parameter is invalid. Values are trimmed before they are checked.

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
| `items` | Courses on this page. Empty when nothing matches or `page` is past the end. |
| `page` | Requested page, including the default. |
| `pageSize` | Requested page size, including the default. |
| `totalItems` | Match count before paging. |
| `totalPages` | `0` when `totalItems` is 0. Otherwise `totalItems` divided by `pageSize`, rounded up. |

A query with no matches returns `200` and an empty `items` array.

## Error response

Invalid `modality`, `status`, `tag`, `page`, `pageSize`, `sort`, or an unknown parameter returns `400`:

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

Each invalid parameter adds one `details` entry.

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&pageSize=5"
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`. A git worktree named `feature-a` uses `https://api.agentcourses.feature-a.localhost` when `WORKTREE_NAME=feature-a`.

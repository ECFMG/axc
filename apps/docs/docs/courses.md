# Courses

`GET /api/courses` searches the in-memory training course catalog. Filters combine with logical and. Sort order is ascending, with `id` as the tie break.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Query | Default | Rule |
| --- | --- | --- |
| `q` | omitted | Case-insensitive substring of `title`, `summary`, or any tag. Empty is invalid. |
| `modality` | omitted | `online`, `in-person`, or `hybrid`. |
| `status` | omitted | `draft`, `active`, or `retired`. |
| `tag` | omitted | Case-insensitive equality against one tag. Empty is invalid. |
| `page` | `1` | Integer greater than or equal to 1. |
| `pageSize` | `10` | Integer from 1 through 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. |

## Response

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
| `items` | The page of courses. Empty when nothing matches or the page is past the end. |
| `page` | Requested page. |
| `pageSize` | Requested page size. |
| `totalItems` | Match count before paging. |
| `totalPages` | `0` when there are no matches; otherwise `ceil(totalItems / pageSize)`. |

No matches return `200` and an empty `items` array.

## Error

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

Every invalid parameter is listed in `details` together.

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active&pageSize=5"
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`. A git worktree named `feature-a` uses `https://api.agentcourses.feature-a.localhost` when `WORKTREE_NAME=feature-a`.

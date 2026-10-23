# Course catalog

`GET /api/courses` searches the training course catalog composed by `@apps/api`. `@axc/rest` parses the query and `@axc/application-services` filters an in-memory seed of 12 courses. No external service or database is required.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Query parameter | Default | Rule |
| --- | --- | --- |
| `q` | omitted | Case-insensitive substring match against `title`, `summary`, or any tag. A blank value is ignored. |
| `modality` | omitted | `online`, `in-person`, or `hybrid`. Match is exact. |
| `status` | omitted | `draft`, `active`, or `retired`. Match is exact. |
| `tag` | omitted | Case-insensitive exact tag match. |
| `page` | `1` | Integer greater than or equal to 1. |
| `pageSize` | `10` | Integer from 1 through 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. Sort is ascending. `title` is compared case-insensitively. |

Filters combine with AND. Unknown query parameters are ignored. A page past the last page returns an empty `items` array and the same totals.

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
| `items` | Course page. Empty when nothing matches. |
| `page` | Requested page, or `1` when omitted. |
| `pageSize` | Requested page size, or `10` when omitted. |
| `totalItems` | Count of courses that match before pagination. |
| `totalPages` | `0` when `totalItems` is `0`. Otherwise `totalItems` divided by `pageSize`, rounded up. |

| Course field | Meaning |
| --- | --- |
| `id` | Unique course ID. |
| `title` | Human-readable course title. |
| `summary` | Short description. |
| `modality` | `online`, `in-person`, or `hybrid`. |
| `status` | `draft`, `active`, or `retired`. |
| `tags` | Searchable tags. |
| `createdAt` | ISO-8601 creation time. |
| `updatedAt` | ISO-8601 update time. |

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

Every invalid parameter is listed in `details`. A query that matches nothing returns `200` with `"items": []`, not this error.

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`. A git worktree named `feature-a` uses `https://api.agentcourses.feature-a.localhost` when `WORKTREE_NAME=feature-a`.

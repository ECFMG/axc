# Course catalog

`GET /api/courses` searches the training course catalog composed by `@apps/api`.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Query | Default | Rule |
| --- | --- | --- |
| `q` | omitted | Case-insensitive substring of `title`, `summary`, or any tag. |
| `modality` | omitted | `online`, `in-person`, or `hybrid`. |
| `status` | omitted | `draft`, `active`, or `retired`. |
| `tag` | omitted | Case-insensitive exact tag match. |
| `page` | `1` | Integer greater than or equal to 1. No leading zeros. |
| `pageSize` | `10` | Integer from 1 to 50. No leading zeros. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. Ascending. Equal values then sort by `id`. |

Enum and sort values are exact lowercase tokens. `q` and `tag` ignore case and surrounding spaces. An unknown parameter, a duplicate parameter, or an empty `q` or `tag` is invalid.

## Success response

`200` with this JSON body. No matches still return `200` and an empty `items` array. `totalPages` is `0` when `totalItems` is `0`. A `page` past the last page returns `200` and an empty `items` array.

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

The sample catalog includes that course, so the request above returns this body.

## Error response

`400` when a query parameter is invalid:

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

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`. A git worktree named `feature-a` uses `https://api.agentcourses.feature-a.localhost` when `WORKTREE_NAME=feature-a`.

# Course catalog

`GET /api/courses` searches the training course catalog composed by `@apps/api`.

The catalog is a seeded fixture of 14 courses. Results can be narrowed with a keyword and with modality, status, and tag filters, then paged and sorted.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Query parameter | Default | Rule |
| --- | --- | --- |
| `q` | omitted | Case-insensitive substring match against `title`, `summary`, or any tag. A blank value is ignored. |
| `modality` | omitted | `online`, `in-person`, or `hybrid`. |
| `status` | omitted | `draft`, `active`, or `retired`. |
| `tag` | omitted | Case-insensitive exact match against a course tag. |
| `page` | `1` | Integer greater than or equal to 1. |
| `pageSize` | `10` | Integer from 1 through 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. Sort order is ascending. |

`modality`, `status`, and `sort` are case-sensitive. Filters that are present are combined with AND. A page past the last page returns an empty `items` array and the same totals.

Unknown query parameters, repeated parameters, and values outside the rules above are invalid.

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
| `items` | Courses for the requested page. Empty when nothing matches. |
| `page` | Page number that was applied. |
| `pageSize` | Page size that was applied. |
| `totalItems` | Count of courses that match before paging. |
| `totalPages` | `0` when `totalItems` is `0`, otherwise `ceil(totalItems / pageSize)`. |

| Course field | Meaning |
| --- | --- |
| `id` | Stable course id. |
| `title` | Course title. |
| `summary` | Short description. |
| `modality` | `online`, `in-person`, or `hybrid`. |
| `status` | `draft`, `active`, or `retired`. |
| `tags` | Searchable tags. |
| `createdAt` | ISO-8601 creation time. |
| `updatedAt` | ISO-8601 update time. |

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

`details` lists every invalid field. A query that matches nothing returns `200` with `"items": []`, not this error.

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active&tag=ai"
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`. A git worktree named `feature-a` uses `https://api.agentcourses.feature-a.localhost` when `WORKTREE_NAME=feature-a`.

## Related

Learners submit enrollment requests for active courses. See [Enrollment requests](./enrollment-requests.md).

# Course catalog

`GET /api/courses` searches the training course catalog composed by `@apps/api`. The Hono route lives in `@axc/rest`. Query parsing, filtering, sorting, and pagination live in `@axc/application-services`. Seeded catalog records live in `@axc/persistence`.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Query parameter | Required | Default | Notes |
| --- | --- | --- | --- |
| `q` | No | none | Case-insensitive keyword match against `title`, `summary`, and `tags`. |
| `modality` | No | none | One of `online`, `in-person`, `hybrid`. |
| `status` | No | none | One of `draft`, `active`, `retired`. |
| `tag` | No | none | Case-insensitive exact match against a course tag. |
| `page` | No | `1` | Integer greater than or equal to `1`. |
| `pageSize` | No | `10` | Integer from `1` to `50`. |
| `sort` | No | `title` | One of `title`, `createdAt`, `updatedAt`. Sort is ascending. |

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
| `items` | Courses for the requested page after filtering and sorting. |
| `page` | Echo of the requested page, or `1` when omitted. |
| `pageSize` | Echo of the requested page size, or `10` when omitted. |
| `totalItems` | Number of courses matching the filters. |
| `totalPages` | `ceil(totalItems / pageSize)`, or `0` when nothing matches. |

No matching courses still return `200` with `items: []`.

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

## Example

```bash
curl -s 'https://api.agentcourses.localhost/api/courses?q=security&status=active'
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`. A git worktree named `feature-a` uses `https://api.agentcourses.feature-a.localhost` when `WORKTREE_NAME=feature-a`.

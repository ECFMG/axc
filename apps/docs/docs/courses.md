# Course catalog

`GET /api/courses` searches the training course catalog composed by `@apps/api`.

The catalog is an in-memory fixture of 12 courses. Filters combine with AND. Keyword search and tag matching are case-insensitive. `modality`, `status`, and `sort` are exact values.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

## Query parameters

| Parameter | Default | Rule |
| --- | --- | --- |
| `q` | omitted | Case-insensitive substring of `title`, `summary`, or any tag. An empty value is ignored. |
| `modality` | omitted | `online`, `in-person`, or `hybrid`. |
| `status` | omitted | `draft`, `active`, or `retired`. |
| `tag` | omitted | Exact tag match, case-insensitive. |
| `page` | `1` | Integer greater than or equal to 1. |
| `pageSize` | `10` | Integer from 1 through 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. Ascending. `id` breaks ties. |

Each parameter may appear once. Any other parameter name is invalid.

A page past the last page returns `200` with an empty `items` array and the requested `page`. When no course matches, `totalItems` and `totalPages` are `0`.

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

The sample above is the response for the request at the top of this page.

| Field | Meaning |
| --- | --- |
| `items` | Courses on this page. |
| `page` | Requested page, after applying the default. |
| `pageSize` | Requested page size, after applying the default. |
| `totalItems` | Number of courses that match before pagination. |
| `totalPages` | `0` when nothing matches; otherwise `totalItems` divided by `pageSize`, rounded up. |

## Error response

Invalid query parameters return `400` with this JSON body:

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

`details` lists every invalid field. Field messages are:

| Field | Message |
| --- | --- |
| `modality` | `modality must be one of online, in-person, hybrid.` |
| `status` | `status must be one of draft, active, retired.` |
| `page` | `page must be an integer greater than or equal to 1.` |
| `pageSize` | `pageSize must be between 1 and 50.` |
| `sort` | `sort must be one of title, createdAt, updatedAt.` |
| any other name | `Unknown query parameter.` |
| a repeated parameter | `<field> must be provided once.` |

## Example

```bash
curl -s 'https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title'
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`. A git worktree named `feature-a` uses `https://api.agentcourses.feature-a.localhost` when `WORKTREE_NAME=feature-a`.

# Course catalog

`GET /api/courses` searches the training course catalog. The route is anonymous, composed by `@apps/api`, and served by the Hono app in `@axc/rest`.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Query parameter | Default | Rules |
| --- | --- | --- |
| `q` | none | Case-insensitive substring match against `title`, `summary`, or any tag. Omit it to skip keyword search. |
| `modality` | none | `online`, `in-person`, or `hybrid`. |
| `status` | none | `draft`, `active`, or `retired`. |
| `tag` | none | Case-insensitive exact tag match. A course matches when any of its tags equals this value. |
| `page` | `1` | Integer greater than or equal to 1. |
| `pageSize` | `10` | Integer from 1 through 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. Sort order is ascending. |

Filters combine. A request may repeat no parameter, and unknown query parameters are rejected. A page past the last page returns an empty `items` array and the requested page number.

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
| `items` | Courses on this page. Empty when nothing matches. |
| `page` | Requested page, after defaults are applied. |
| `pageSize` | Requested page size, after defaults are applied. |
| `totalItems` | Number of courses that matched before pagination. |
| `totalPages` | `0` when `totalItems` is 0. Otherwise `totalItems` divided by `pageSize`, rounded up. |

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

`details` lists every invalid parameter. A search with no matches is not an error.

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active"
```

The catalog is an in-memory fixture of 12 courses. See [ADR 0001](./adr/0001-in-memory-course-catalog.md) for why it is not stored in MongoDB.

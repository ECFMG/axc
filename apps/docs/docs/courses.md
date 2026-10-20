# Course catalog

`GET /api/courses` returns a page of training courses. `@apps/api` supplies an in-memory catalog of 12 courses. `@axc/rest` validates the query string and `@axc/application-services` filters, sorts, and pages the list.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Query | Default | Rule |
| --- | --- | --- |
| `q` | omitted | Case-insensitive match against `title`, `summary`, or any tag. |
| `modality` | omitted | `online`, `in-person`, or `hybrid`. |
| `status` | omitted | `draft`, `active`, or `retired`. |
| `tag` | omitted | Case-insensitive match against one tag. |
| `page` | `1` | Integer greater than or equal to 1. |
| `pageSize` | `10` | Integer from 1 through 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. Ascending. |

Filters combine with and. A page past the last result is still `200` with an empty `items` array. No matches are `200` with `items: []`, `totalItems: 0`, and `totalPages: 0`.

Unknown query parameters, repeated parameters, and values outside the lists above return `400`.

## Success response

`200`:

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
| `items` | Courses on this page. |
| `page` | Requested page, or `1` when omitted. |
| `pageSize` | Requested page size, or `10` when omitted. |
| `totalItems` | Match count before paging. |
| `totalPages` | `0` when nothing matches. Otherwise `totalItems` divided by `pageSize`, rounded up. |

## Error response

`400`:

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
curl -s "https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active"
```

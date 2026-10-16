# Course catalog

`GET /api/courses` searches the training course catalog. Filters combine with `AND`. Keyword search matches title, summary, or tags. An empty match list is a successful page, not an error.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Parameter | Default | Rule |
| --- | --- | --- |
| `q` | omitted | Case-insensitive keyword matched against title, summary, and tags. |
| `modality` | omitted | `online`, `in-person`, or `hybrid`. |
| `status` | omitted | `draft`, `active`, or `retired`. |
| `tag` | omitted | Case-insensitive exact tag. |
| `page` | `1` | Integer greater than or equal to 1. |
| `pageSize` | `10` | Integer from 1 to 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. Ascending. |

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
| `items` | Courses on this page. Empty when nothing matches. |
| `page` | Requested page. |
| `pageSize` | Requested page size. |
| `totalItems` | Courses matching the filters. |
| `totalPages` | `0` when `totalItems` is `0`, otherwise `ceil(totalItems / pageSize)`. |

`id` is the course identifier. `createdAt` and `updatedAt` are ISO-8601 timestamps.

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

Unknown parameter names, repeated parameters, empty `q` or `tag`, and values outside the lists above use the same error shape. `details` lists every invalid field.

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active"
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`. The catalog is loaded into the local MongoDB process when the API starts.

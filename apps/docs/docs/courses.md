# Course catalog

`GET /api/courses` searches a sample catalog of 12 courses. The catalog uses deterministic, in-memory fixtures and requires no database or external service. It includes drafts and retired courses unless a status filter is provided.

## Query parameters

| Parameter | Values and behavior | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring search across title, summary, and each tag. Surrounding whitespace is trimmed; empty means no filter. | No filter |
| `modality` | `online`, `in-person`, `hybrid` (case-sensitive) | No filter |
| `status` | `draft`, `active`, `retired` (case-sensitive) | No filter |
| `tag` | Case-insensitive exact tag match. Surrounding whitespace is trimmed; empty means no filter. | No filter |
| `page` | Positive safe integer written in decimal digits, starting at 1 | `1` |
| `pageSize` | Integer from 1 to 50 written in decimal digits | `10` |
| `sort` | `title`, `createdAt`, `updatedAt`; ascending, with id as a tie breaker | `title` |

All filters combine with AND. Filtering and sorting happen before pagination. Unknown or repeated query parameters are invalid. Empty enum and numeric values are invalid.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

## Success response

HTTP `200`:

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
      "updatedAt": "2026-06-12T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

`totalItems` counts all matching courses; `totalPages` is the ceiling of `totalItems / pageSize`. A page beyond the results returns empty `items` with unchanged totals. No matches return HTTP `200` with empty `items`, `totalItems: 0`, and `totalPages: 0`.

## Validation error

HTTP `400`:

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

Each invalid field appears in `details`. Invalid requests are rejected before querying the catalog.

## Local example

```bash
curl 'https://api.agentcourses.localhost/api/courses?q=security&pageSize=5'
```

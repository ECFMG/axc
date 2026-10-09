# Course catalog

`GET /api/courses` searches a read-only training catalog. The sample app uses 12 deterministic in-memory courses with all modalities and statuses; no database or external service is needed.

## Query parameters

All parameters are optional and may be supplied once. Filters are combined with AND.

| Parameter | Behavior | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring across title, summary, and each tag. An empty value imposes no keyword filter. | No filter |
| `modality` | `online`, `in-person`, or `hybrid` (case-sensitive). | No filter |
| `status` | `draft`, `active`, or `retired` (case-sensitive). | No filter |
| `tag` | Case-insensitive whole-tag equality. | No filter |
| `page` | Positive safe integer written as decimal digits. | `1` |
| `pageSize` | Integer from `1` through `50` written as decimal digits. | `10` |
| `sort` | `title`, `createdAt`, or `updatedAt`; ascending, with ID as a tie-breaker. | `title` |

Filtering and sorting happen before pagination. Dates are ISO strings. `totalItems` counts all matches; `totalPages` is zero when there are no matches. Pages beyond the results return an empty `items` array with unchanged totals. Unknown parameters, duplicate parameters, empty enum/numeric values, and invalid values return HTTP 400. Whitespace is preserved in keyword and tag values. An empty tag matches no fixture course.

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

No matches return HTTP `200` with `items: []`, `totalItems: 0`, `totalPages: 0`, and the requested page and page size.

## Error response

For example, `GET /api/courses?pageSize=51` returns HTTP `400`:

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

Multiple invalid parameters are reported together in `details`.

```bash
curl 'https://api.agentcourses.localhost/api/courses?q=security&pageSize=5'
```

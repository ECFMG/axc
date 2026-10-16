# Course catalog

`GET /api/courses` searches the sample training catalog. Local startup seeds 12 courses with mixed modalities, statuses, dates, and tags.

| Query | Accepted input | Default |
| --- | --- | --- |
| `q` | Literal text matched case-insensitively anywhere in title, summary, or any tag | Absent |
| `modality` | `online`, `in-person`, `hybrid` | Absent |
| `status` | `draft`, `active`, `retired` | Absent |
| `tag` | Exact tag, case-insensitive | Absent |
| `page` | Positive safe whole number; paging offset must also be safe | `1` |
| `pageSize` | Whole number from 1 through 50 | `10` |
| `sort` | `title`, `createdAt`, `updatedAt`, ascending; ties use course ID | `title` |

Filters combine with AND; keyword fields combine with OR. Empty or whitespace-only optional parameters count as absent. Unknown parameters are ignored. Search text is escaped before constructing MongoDB regexes; filtering, counting, sorting, and paging run in MongoDB.

Example: `GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title`.

A successful response is HTTP 200:

```json
{
  "items": [
    {
      "id": "course-001",
      "title": "AI Security Foundations",
      "summary": "Training in AI Security Foundations.",
      "modality": "online",
      "status": "active",
      "tags": ["ai", "security"],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-06-01T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

No matches return HTTP 200 with `items: []`, `totalItems: 0`, and `totalPages: 0`. A page beyond the result set has an empty items array while retaining the total count.

Invalid query input returns HTTP 400 with a detail for each invalid field:

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [{ "field": "pageSize", "message": "pageSize must be between 1 and 50." }]
  }
}
```

Unexpected failures return HTTP 500 with code `INTERNAL_ERROR`, message `The request could not be completed.`, and an empty details array. Internal errors are logged server-side.

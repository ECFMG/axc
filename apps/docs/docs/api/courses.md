# Course catalog API

`GET /api/courses` searches the sample training catalog. No authentication is required. The local API starts with 12 courses spanning all modalities and statuses.

| Query parameter | Accepted input | Default |
| --- | --- | --- |
| `q` | Literal, case insensitive substring in title, summary, or any tag | Absent |
| `modality` | `online`, `in-person`, `hybrid` | Absent |
| `status` | `draft`, `active`, `retired` | Absent |
| `tag` | Exact tag, case insensitive | Absent |
| `page` | Positive whole number within the supported integer range | `1` |
| `pageSize` | Whole number from `1` through `50` | `10` |
| `sort` | `title`, `createdAt`, `updatedAt`, ascending | `title` |

Filters combine with AND; keyword fields combine with OR. Empty or whitespace-only optional values are absent. Text is trimmed. Regex metacharacters are treated literally. Sorting uses the unique course ID to break ties. Pages beyond the available results return an empty `items` array. Pagination offsets must fit JavaScript's safe integer range.

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

Successful response: **200**.

```json
{
  "items": [
    {
      "id": "course-001",
      "title": "AI Security Foundations",
      "summary": "Secure AI-assisted development.",
      "modality": "online",
      "status": "active",
      "tags": ["ai", "security"],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-15T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

With no matches, `items` is empty and both `totalItems` and `totalPages` are zero.

Invalid query values return **400** with a consistent envelope:

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [{ "field": "pageSize", "message": "pageSize must be between 1 and 50." }]
  }
}
```

Unexpected failures return **500** with code `INTERNAL_ERROR`, a generic message, and an empty details array. Internal errors are logged server-side.

See [enrollment requests](enrollment-requests.md) to request an active course.

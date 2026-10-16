# Course catalog API

`GET /api/courses` searches the local training catalog. Local startup seeds 12 courses with all modalities and statuses. Requests combine filters with AND; `q` matches any of title, summary, or tags, case insensitively. Text is treated literally, including regular expression characters. Tags match a whole tag, case insensitively.

| Query parameter | Accepted input | Default |
| --- | --- | --- |
| `q` | Keyword substring | None |
| `modality` | `online`, `in-person`, `hybrid` | None |
| `status` | `draft`, `active`, `retired` | None |
| `tag` | Whole tag | None |
| `page` | Positive integer | `1` |
| `pageSize` | Integer from `1` to `50` | `10` |
| `sort` | `title`, `createdAt`, `updatedAt` | `title` |

Sorting is ascending, with course ID as the tie breaker. Empty optional parameters are omitted; unknown parameters are ignored. Pagination accepts ordinary decimal integers, without exponents, signs, fractions, or surrounding whitespace. Pages beyond the results return an empty array. Page values must allow safely representable numeric offsets.

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

Success (`200`):

```json
{
  "items": [
    {
      "id": "course-001",
      "title": "AI Security Foundations",
      "summary": "Introductory secure AI development.",
      "modality": "online",
      "status": "active",
      "tags": ["ai", "security"],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-12-15T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

No matches return `200` with `items: []`, `totalItems: 0`, and `totalPages: 0`.

Invalid query input (`400`):

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [{ "field": "pageSize", "message": "pageSize must be between 1 and 50." }]
  }
}
```

Unexpected failures return `500` with code `INTERNAL_ERROR` and no internal diagnostics. See the [enrollment request API](./enrollment-requests.md) to request an active course.

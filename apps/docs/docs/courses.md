# Course catalog

`GET /api/courses` searches the sample training catalog. It requires no external services and uses twelve fixture courses held in memory. All statuses, including drafts and retired courses, are visible unless filtered.

## Query parameters

| Parameter | Meaning | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring in title, summary, or any tag | No keyword filter |
| `modality` | `online`, `in-person`, `hybrid` | All modalities |
| `status` | `draft`, `active`, `retired` | All statuses |
| `tag` | Case-insensitive whole-tag match | No tag filter |
| `page` | Positive safe integer, starting at 1 | `1` |
| `pageSize` | Integer from 1 through 50 | `10` |
| `sort` | `title`, `createdAt`, `updatedAt` | `title` |

Filters combine with AND. Text is trimmed; empty or whitespace-only optional parameters are treated as omitted. Enum values are case-sensitive. Numeric inputs must contain decimal digits only: signs, surrounding whitespace, decimals, exponents, and unsafe integers are invalid. Unknown and repeated parameters return 400.

All sorting is ascending, with ID as the tie-breaker. Titles use locale string comparison; timestamps use ISO string order. Pagination follows filtering and sorting. `totalItems` counts all matches before paging, and `totalPages` is the ceiling of `totalItems / pageSize`. No matches return 200 with `items: []`, `totalItems: 0`, and `totalPages: 0`. Pages beyond the last page return an empty array while retaining the matching totals.

## Example success

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

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
      "createdAt": "2026-12-15T00:00:00.000Z",
      "updatedAt": "2027-06-01T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

## Example error

`GET /api/courses?pageSize=51` returns HTTP 400:

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

Validation collects errors in `details`; invalid requests never call the catalog service. The API composition root supplies the fixture repository to application services. The repository owns matching, sorting, and paging; REST owns query validation and HTTP responses. The catalog has no write operations or durable storage.

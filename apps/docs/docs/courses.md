# Courses

`GET /api/courses` searches the sample training catalog. It requires no external services and uses 12 deterministic fixture courses wired by the API composition root. No database or production data is used.

## Query parameters

All parameters are optional, may appear once, and combine with AND. Unknown parameters and repeated parameters return 400.

| Parameter | Values / behavior | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring search across title, summary, and each tag | No keyword filter |
| `modality` | `online`, `in-person`, `hybrid` (case-sensitive) | All modalities |
| `status` | `draft`, `active`, `retired` (case-sensitive) | All statuses |
| `tag` | Case-insensitive whole-tag match | All tags |
| `page` | Positive decimal integer, at most 9007199254740991 | `1` |
| `pageSize` | Integer from 1 through 50 | `10` |
| `sort` | `title`, `createdAt`, `updatedAt`, ascending; ties use ID | `title` |

Surrounding whitespace is trimmed from `q` and `tag`; empty text filters are ignored. Sorting and filtering happen before pagination. Date sorts are chronological for the UTC ISO timestamps in the fixtures. Pages beyond the last page return an empty list while preserving totals. No matches return 200 with zero totals and zero total pages.

## Request and success response

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

HTTP 200:

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

## Error response

```http
GET /api/courses?pageSize=51
```

HTTP 400:

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

Numeric parameters reject empty, fractional, negative, nonnumeric, and unsafe integer values. Enum parameters reject unrecognized or empty values. Errors list the invalid fields in `details`.

## Implementation notes

The domain owns the course model, modality/status constants, and read-only catalog port. The Cellix seedwork repository offers `get`/`save` for mutable aggregates; this search uses a separate read-only listing port. Persistence returns isolated fixture snapshots. Application services own filtering, sorting, and pagination; REST owns parsing, validation, and HTTP responses. Only workspace dependencies and the existing Vitest test tooling were added.

The fixture implementation scans and sorts the catalog in memory. It is intended for the sample evaluation, not a production storage or full-text search implementation.

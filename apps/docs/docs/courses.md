# Course catalog

`GET /api/courses` searches the sample training catalog without external services.
The API composition root supplies twelve in-memory fixture courses to a read repository.
All statuses, including draft and retired courses, are visible by default.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Parameter | Meaning | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring in title, summary, or any tag. | No keyword filter |
| `modality` | Exactly `online`, `in-person`, or `hybrid`. | All modalities |
| `status` | Exactly `draft`, `active`, or `retired`. | All statuses |
| `tag` | Case-insensitive exact match to any tag. | No tag filter |
| `page` | Positive safe integer written in decimal digits; starts at 1. | `1` |
| `pageSize` | Integer written in decimal digits, from 1 through 50. | `10` |
| `sort` | `title`, `createdAt`, or `updatedAt`, ascending; ties use ascending `id`. | `title` |

Filters combine with AND. Empty or whitespace-only inputs are treated as omitted.
Keyword and tag values are trimmed. Nonblank enum and numeric values must match their format exactly;
signs, fractional numbers, exponent notation and surrounding numeric whitespace are invalid.
Unrecognized query names are ignored; for repeated names the first value is used.
Filtering and sorting happen before pagination. Date sorting uses ISO date strings;
title sorting uses JavaScript `localeCompare`.

## Success response

`200 OK`:

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
      "updatedAt": "2027-12-01T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

`totalItems` counts all matching records before paging. `totalPages` is the ceiling of
`totalItems / pageSize`. No matches return `200` with `items: []`, `totalItems: 0`,
and `totalPages: 0`. A page beyond the last page also returns an empty array while
retaining the matching totals and requested page.

## Error response

Invalid supported parameters return `400 Bad Request`. All invalid fields are reported
in the same error envelope:

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

## Local example

```bash
curl 'https://api.agentcourses.localhost/api/courses?q=security&pageSize=5'
```

The data is a static sample catalog; no database or write endpoint is provided.

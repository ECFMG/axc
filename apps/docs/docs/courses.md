# Course catalog search

`GET /api/courses` searches a local sample catalog of 15 courses without external services or production data. The Azure host has an empty route prefix, so the function explicitly registers `api/courses`. The existing health endpoint remains at `/health`.

## Query parameters

All parameters are optional and may appear once. Filters combine with AND.

| Parameter | Values and behavior | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring across title, summary, or any tag. Surrounding whitespace is trimmed; blank values are invalid. | No keyword filter |
| `modality` | `online`, `in-person`, `hybrid` (case-sensitive enum) | All modalities |
| `status` | `draft`, `active`, `retired` (case-sensitive enum) | All statuses |
| `tag` | Case-insensitive whole-tag match; surrounding whitespace trimmed; blank values invalid | All tags |
| `page` | Positive safe integer written using decimal digits | `1` |
| `pageSize` | Integer from `1` to `50`, inclusive | `10` |
| `sort` | `title`, `createdAt`, `updatedAt` | `title` |

Sorts are ascending; titles compare case-insensitively and dates compare by ISO timestamp. Ties use course ID. Filtering and sorting happen before pagination. A page beyond the result range returns empty items with the requested page and unchanged totals. No matches produces `totalItems: 0` and `totalPages: 0`.

Unknown parameters, duplicates, empty values, invalid enums, fractions, signs, exponent notation, unsafe integers, and out-of-range numbers return HTTP 400. Leading zeroes on decimal integers are accepted.

## Example request and success response

```http
GET /api/courses?q=security&modality=online&status=active&tag=AI&page=1&pageSize=5&sort=title
```

HTTP 200 (`application/json`):

```json
{
  "items": [{
    "id": "course-001",
    "title": "AI Security Foundations",
    "summary": "Introductory course on secure AI-assisted development.",
    "modality": "online",
    "status": "active",
    "tags": ["ai", "security"],
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-06-15T00:00:00.000Z"
  }],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

## Error response

`GET /api/courses?pageSize=51` returns HTTP 400:

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [{ "field": "pageSize", "message": "pageSize must be between 1 and 50." }]
  }
}
```

## Implementation and validation

The application service owns the Course model, fixtures, validation and search. Hono forwards raw query values, preserves duplicate detection and maps the result to HTTP. The API composition root registers the existing Azure adapter. Fixture results are copied per request to prevent callers from changing subsequent searches. This catalog is intentionally fixture-backed and does not persist writes.

Run the workspace build before `pnpm --filter @apps/api test:courses`. Service cases run through `pnpm --filter @axc/application-services test`. The independent harness oracle can exercise both the Hono app and the actual Azure Functions host. Workspace `test`, `lint`, `build`, `typecheck`, and `test:arch` retain their existing behavior.

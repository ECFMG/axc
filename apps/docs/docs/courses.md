# Course catalog

`GET /api/courses` searches the sample training catalog. No database or external service is required. The API composition root injects an in-memory repository containing 12 courses.

## Query parameters

| Parameter | Values / behavior | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring in title, summary, or any tag | No keyword filter |
| `modality` | `online`, `in-person`, `hybrid` (case-sensitive) | All modalities |
| `status` | `draft`, `active`, `retired` (case-sensitive) | All statuses |
| `tag` | Case-insensitive exact tag match | All tags |
| `page` | Positive safe integer in decimal digits | `1` |
| `pageSize` | Integer from `1` through `50` | `10` |
| `sort` | `title`, `createdAt`, `updatedAt` | `title` |

Filters combine with AND. `q` and `tag` are trimmed; empty or whitespace-only values mean no filter. Sorting is ascending, with course ID breaking ties. Filtering and sorting happen before pagination. Unknown or repeated parameters return 400; unsupported enum values and malformed or out-of-range numbers also return 400.

## Example

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
      "updatedAt": "2026-06-01T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

`totalItems` counts matches before pagination. No matches return HTTP 200 with `items: []`, `totalItems: 0`, and `totalPages: 0`. Pages beyond the last page also return an empty array while retaining the match totals.

## Invalid request

`GET /api/courses?pageSize=51` returns HTTP 400:

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [
      { "field": "pageSize", "message": "pageSize must be between 1 and 50." }
    ]
  }
}
```

Multiple invalid fields are reported together in `details`.

## Implementation notes

The domain owns the Course contract and repository interface. Persistence provides isolated fixture snapshots; application services search, sort, and paginate; REST validates the query and serializes the response. `apps/api` supplies the repository and registers the Azure Functions route. The existing host has an empty route prefix, so the registration uses `api/courses` explicitly.

This read-only sample lists draft and retired courses unless filtered. The fixture is reset with each process and is not a production database adapter. No external dependencies were added; internal workspace dependencies declare the new layer connections. The root lockfile is outside the task's allowed write boundary, so it was preserved; a future permitted workspace install must refresh its importer entries before using frozen-lockfile installation.

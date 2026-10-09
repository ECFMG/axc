# Course catalog

`GET /api/courses` searches the sample training catalog. It uses 12 deterministic fixtures and requires no database or external service.

## Query parameters

| Parameter | Behavior | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring search across title, summary, and individual tags. | No filter |
| `modality` | One of `online`, `in-person`, `hybrid`. | No filter |
| `status` | One of `draft`, `active`, `retired`. | No filter |
| `tag` | Case-insensitive exact match against any tag. | No filter |
| `page` | Positive safe integer, starting at 1. | `1` |
| `pageSize` | Integer between 1 and 50. | `10` |
| `sort` | `title`, `createdAt`, or `updatedAt`, ascending with ID as a tie breaker. | `title` |

Filters combine with AND, before sorting and pagination. Search terms are trimmed; blank `q` and `tag` mean no filter. Enum values are case-sensitive. Unknown or repeated parameters, empty enum or numeric values, and non-integer numeric values return 400. Numeric values must contain decimal digits only.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

## Successful response

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

`totalItems` counts all matching courses before pagination. `totalPages` is the ceiling of `totalItems / pageSize`. A page beyond the last page returns empty `items` while retaining totals. No matches return HTTP 200, empty `items`, and both totals set to zero.

## Validation error

HTTP 400 for `GET /api/courses?pageSize=51`:

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

All detected parameter errors are included in `details`.

## Implementation notes

The domain owns the Course model, modality/status constants, and read-only catalog contract. Persistence supplies fixture copies; application services filter, sort, and paginate; Hono returns the HTTP contract; the API composition root injects the catalog and registers the Azure Functions route. The existing Cellix repository has a mutable `get`/`save` contract, so this read-only list uses a separate domain port.

Only existing workspace packages and the established Vitest toolchain were linked. No new third-party dependency versions were introduced. This sample performs in-memory searches and offers no catalog editing or durable storage.

The docs package extends Turbo build inputs to include Markdown, the sidebar, and Docusaurus configuration, so documentation edits invalidate cached builds.

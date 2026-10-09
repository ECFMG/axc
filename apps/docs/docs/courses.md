# Course catalog

`GET /api/courses` searches the local sample training catalog. All filters are combined with AND. The catalog contains 12 fixtures and needs no database or external service.

## Query parameters

| Parameter | Values and behavior | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring search across title, summary, and tags | No keyword filter |
| `modality` | `online`, `in-person`, `hybrid` | All modalities |
| `status` | `draft`, `active`, `retired` | All statuses |
| `tag` | Case-insensitive exact tag match | No tag filter |
| `page` | Positive integer with a safe pagination offset; maximum 180143985094819 | `1` |
| `pageSize` | Integer from 1 to 50 | `10` |
| `sort` | `title`, `createdAt`, `updatedAt` | `title` |

Search text and tags are trimmed; empty values apply no filter. Enum values are case-sensitive. Sorting is ascending with course ID as the tie breaker. Filtering and sorting happen before pagination. Unknown or repeated parameters, empty enum or numeric values, fractions, and malformed numbers return 400.

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
      "updatedAt": "2026-06-12T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

`totalItems` counts all matching courses before pagination. `totalPages` is the ceiling of `totalItems / pageSize`. No matches return HTTP 200 with `items: []`, `totalItems: 0`, and `totalPages: 0`. A page beyond the last page returns an empty array while preserving matching totals.

## Invalid query response

HTTP 400 for `/api/courses?pageSize=51`:

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

Multiple invalid fields are returned together in `details`.

## Implementation notes

The domain owns the course model, allowed enums, search/page types, and repository contract. The persistence package implements an isolated in-memory repository using local fixtures and copies records on reads and writes. Application services filter, sort, and paginate records; Hono validates query parameters and serializes responses. The API composition root injects the repository and registers the `api/courses` Azure Functions route.

This sample catalog is loaded into memory at process startup. Changes are not durable and search scans the catalog in memory. No third-party dependency was added; workspace references connect the existing layers and test tooling.

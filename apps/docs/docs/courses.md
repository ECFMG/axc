# Course catalog search

`GET /api/courses` searches the training course catalog. Every parameter is optional; a
request with no parameters returns the first page of the catalog ordered by title.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

### Query parameters

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `q` | string | — | Case-insensitive substring match against `title`, `summary`, and `tags`. A course matches when any one of the three does. |
| `modality` | `online` \| `in-person` \| `hybrid` | — | Exact match. |
| `status` | `draft` \| `active` \| `retired` | — | Exact match. |
| `tag` | string | — | Case-insensitive match against a whole tag. `tag=ai` matches a course tagged `AI`; it does not match one tagged `ai-safety`. |
| `page` | integer | `1` | 1-based. Must be `1` or greater. |
| `pageSize` | integer | `10` | Must be between `1` and `50`. |
| `sort` | `title` \| `createdAt` \| `updatedAt` | `title` | Ascending, with `title` and then `id` as tie-breakers. |

Filters combine with AND: a request with `q`, `modality`, and `status` returns only the
courses that satisfy all three. Empty and whitespace-only `q` and `tag` values are treated
as "no filter" rather than as errors. Unrecognised query parameters are ignored.

## Success response

`200` with a page of courses and the metadata needed to request the next one:

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

| Field | Meaning |
| --- | --- |
| `items` | The courses on the requested page. Empty when nothing matches, or when `page` is past the last page. |
| `page` | The requested page, echoed back. |
| `pageSize` | The requested page size, echoed back. |
| `totalItems` | Number of courses matching the filters, across all pages. |
| `totalPages` | `ceil(totalItems / pageSize)`. `0` when nothing matches. |

A search with no matches is a successful, empty page — not an error.

### Course fields

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique course identifier. |
| `title` | string | Human-readable title. |
| `summary` | string | Short description. |
| `modality` | `online` \| `in-person` \| `hybrid` | How the course is delivered. |
| `status` | `draft` \| `active` \| `retired` | Lifecycle state. |
| `tags` | string[] | Searchable tags. |
| `createdAt` | string | ISO-8601 timestamp. |
| `updatedAt` | string | ISO-8601 timestamp. |

## Error response

`400` when one or more query parameters are invalid. Every invalid parameter is reported in
a single response, in the order `modality`, `status`, `page`, `pageSize`, `sort`:

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

| Parameter | Rejected when | Message |
| --- | --- | --- |
| `modality` | Not one of the allowed values | `modality must be one of online, in-person, hybrid.` |
| `status` | Not one of the allowed values | `status must be one of draft, active, retired.` |
| `page` | Not a whole number, or less than 1 | `page must be an integer of 1 or greater.` |
| `pageSize` | Not a whole number, or outside 1–50 | `pageSize must be between 1 and 50.` |
| `sort` | Not one of the allowed values | `sort must be one of title, createdAt, updatedAt.` |

An invalid query is rejected before the catalog is read, so no partial results are returned.

## Examples

```bash
# First page, default ordering
curl -s https://api.agentcourses.localhost/api/courses

# Active online courses mentioning security
curl -s 'https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active'

# Newest-last, 5 at a time
curl -s 'https://api.agentcourses.localhost/api/courses?sort=createdAt&page=2&pageSize=5'
```

## Data source

The catalog is fixture data held in memory by `@axc/persistence`, so the endpoint runs with
no database and no external services. Fourteen seeded courses cover every modality and
status, with tags shared across courses. See
[the decision record](./decisions/0001-course-catalog-search-endpoint.md) for why.

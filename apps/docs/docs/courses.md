# Course catalog

`GET /api/courses` searches the training course catalog. The route is served by the Hono app in
`@axc/rest`, validated and paged by `@axc/application-services`, and read through the
`CourseCatalogReadRepository` contract that `@apps/api` injects.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

### Query parameters

All parameters are optional. Unrecognized parameters are ignored.

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `q` | string | — | Case-insensitive substring match against `title`, `summary`, or any tag. Blank values are treated as absent. |
| `modality` | enum | — | One of `online`, `in-person`, `hybrid`. |
| `status` | enum | — | One of `draft`, `active`, `retired`. |
| `tag` | string | — | Case-insensitive match against a whole tag. `secur` does not match the tag `security`. |
| `page` | integer | `1` | Must be `1` or greater. |
| `pageSize` | integer | `10` | Must be between `1` and `50`. |
| `sort` | enum | `title` | One of `title`, `createdAt`, `updatedAt`. Always ascending, with a stable tie-break on `id`. |

Filters combine with AND: a course is returned only when it satisfies every supplied filter.

## Course

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique course id. |
| `title` | string | Human-readable title. |
| `summary` | string | Short description. |
| `modality` | enum | `online`, `in-person`, or `hybrid`. |
| `status` | enum | `draft`, `active`, or `retired`. |
| `tags` | string[] | Searchable tags. |
| `createdAt` | string | ISO-8601 date-time. |
| `updatedAt` | string | ISO-8601 date-time. |

## Success response

`200` with the matching page and its pagination metadata:

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
| `items` | Courses on the requested page, at most `pageSize` of them. |
| `page` | Page that was returned. |
| `pageSize` | Page size that was applied. |
| `totalItems` | Courses matching the filters across all pages. |
| `totalPages` | `ceil(totalItems / pageSize)`. `0` when nothing matches. |

A search with no matches is a success, not an error: `items` is `[]`, `totalItems` is `0`, and
`totalPages` is `0`. A `page` beyond the last page behaves the same way, and `totalItems` still
reports the full match count.

## Error response

`400` when one or more query parameters are invalid. Every invalid parameter is reported, not only
the first one:

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

| Parameter | Rejected when |
| --- | --- |
| `modality` | Not `online`, `in-person`, or `hybrid`. |
| `status` | Not `draft`, `active`, or `retired`. |
| `sort` | Not `title`, `createdAt`, or `updatedAt`. |
| `page` | Not a whole number, or less than `1`. |
| `pageSize` | Not a whole number, or outside `1`–`50`. |

## Examples

```bash
# First page, default page size and sort
curl -s https://api.agentcourses.localhost/api/courses

# Active online courses mentioning security
curl -s 'https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active'

# Second page of five, newest-created last
curl -s 'https://api.agentcourses.localhost/api/courses?page=2&pageSize=5&sort=createdAt'
```

## Catalog data

The catalog is served from a deterministic fixture of fourteen courses in `@axc/persistence`,
covering every modality and status, so the endpoint runs with no database and no external
services. See [Fixture-backed course catalog read model](decisions/0001-fixture-backed-course-catalog-read-model.md).

# Course catalog

`GET /api/courses` searches the training course catalog. The route is served by the Hono app
in `@axc/rest`, validated in `@axc/domain`, and read through the `CourseReadRepository` port
implemented in `@axc/persistence`.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

### Query parameters

All parameters are optional. Values are trimmed, and a blank value is treated as if the
parameter had been omitted. Unrecognised parameters are ignored.

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `q` | string | — | Case-insensitive substring match against `title`, `summary` and any `tag`. Maximum 200 characters. |
| `modality` | enum | — | One of `online`, `in-person`, `hybrid`. |
| `status` | enum | — | One of `draft`, `active`, `retired`. |
| `tag` | string | — | Case-insensitive exact match against one of the course's tags (not a prefix match). |
| `page` | integer | `1` | 1-based. Must be a whole number of 1 or greater. |
| `pageSize` | integer | `10` | Must be between 1 and 50. |
| `sort` | enum | `title` | One of `title`, `createdAt`, `updatedAt`. |

Filters combine with AND: a course is returned only when it satisfies every supplied filter.

### Sorting

All three sorts are ascending. `title` is compared case-insensitively; `createdAt` and
`updatedAt` are compared as ISO-8601 strings, which orders them chronologically. Ties are
broken by `id` so that paging is stable across requests.

## Success response

`200` with a page of results and its pagination metadata:

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
| `items` | The requested page of courses, already filtered and sorted. |
| `page` | The page that was served, echoing the request or the default. |
| `pageSize` | The page size that was served. Never more than 50. |
| `totalItems` | Number of courses matching the filters, across all pages. |
| `totalPages` | `ceil(totalItems / pageSize)`. `0` when nothing matches. |

A query that matches nothing is a success, not an error: the response is `200` with
`"items": []`, `"totalItems": 0` and `"totalPages": 0`.

### Course fields

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Stable course identifier. |
| `title` | string | Human-readable title. |
| `summary` | string | Short description. |
| `modality` | enum | `online`, `in-person` or `hybrid`. |
| `status` | enum | `draft`, `active` or `retired`. |
| `tags` | string[] | Labels as authored. Matching is case-insensitive. |
| `createdAt` | string | ISO-8601 instant. |
| `updatedAt` | string | ISO-8601 instant. |

## Error response

`400` when one or more parameters fail validation. Every invalid parameter is reported in a
single response rather than only the first:

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

| Field | Message |
| --- | --- |
| `q` | `q must be 200 characters or fewer.` |
| `modality` | `modality must be one of online, in-person, hybrid.` |
| `status` | `status must be one of draft, active, retired.` |
| `tag` | Never rejected; any string is a valid tag filter. |
| `page` | `page must be an integer greater than or equal to 1.` |
| `pageSize` | `pageSize must be between 1 and 50.` |
| `sort` | `sort must be one of title, createdAt, updatedAt.` |

## Examples

```bash
# Default page of the catalog
curl -s https://api.agentcourses.localhost/api/courses

# Active online courses mentioning security anywhere
curl -s 'https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active'

# Second page of five, newest changes last
curl -s 'https://api.agentcourses.localhost/api/courses?page=2&pageSize=5&sort=updatedAt'
```

## Data source

The catalog is served from a fixture of 14 courses in `@axc/persistence`
(`COURSE_SEED_DATA`), covering every modality and status with mixed tag casing. See
[ADR 0001](./decisions/0001-course-catalog-read-model.md) for why the read model is
in-memory and what would change to move it behind Mongoose.

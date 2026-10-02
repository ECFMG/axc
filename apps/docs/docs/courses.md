# Courses

`GET /api/courses` searches the training course catalog. Every course is returned by the
composition in `@apps/api`: the Hono route in `@axc/rest` calls the course search use case in
`@axc/application-services`, which queries the read repository in `@axc/persistence` using the
catalog rules in `@axc/domain`.

The endpoint is anonymous, read-only, and has no side effects.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

### Query parameters

All parameters are optional. A parameter that is absent, empty, or whitespace-only falls back to
its default. Unrecognised parameters are ignored.

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `q` | string | — | Case-insensitive substring match against `title`, `summary`, and any `tag`. |
| `modality` | enum | — | One of `online`, `in-person`, `hybrid`. |
| `status` | enum | — | One of `draft`, `active`, `retired`. |
| `tag` | string | — | Course must carry this exact tag, compared case-insensitively. |
| `page` | integer | `1` | One-based. Must be `1` or greater. |
| `pageSize` | integer | `10` | Must be between `1` and `50`. |
| `sort` | enum | `title` | One of `title`, `createdAt`, `updatedAt`. Always ascending. |

Filters combine with AND: a course is returned only when it satisfies every supplied parameter.
Ordering is made total by tie-breaking on `title` and then `id`, so paging never repeats or skips
a course when two records share a sort key.

## Response

`200` with this JSON body:

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
| `items` | Courses on the requested page, already filtered and ordered. |
| `page` | Echo of the resolved page number. |
| `pageSize` | Echo of the resolved page size. |
| `totalItems` | Number of courses matching the filters across all pages. |
| `totalPages` | Number of pages those courses span. `0` when nothing matches. |

### Course fields

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Stable, unique course identifier. |
| `title` | string | Human-readable course title. |
| `summary` | string | Short description. |
| `modality` | enum | `online`, `in-person`, or `hybrid`. |
| `status` | enum | `draft`, `active`, or `retired`. |
| `tags` | string[] | Searchable tags. Case is preserved as seeded. |
| `createdAt` | string | ISO-8601 timestamp. |
| `updatedAt` | string | ISO-8601 timestamp. |

### No matches

A query that matches nothing is a success, not an error. The response is `200` with an empty
`items` array and valid pagination metadata:

```json
{ "items": [], "page": 1, "pageSize": 10, "totalItems": 0, "totalPages": 0 }
```

A `page` past the last page behaves the same way: `items` is empty while `totalItems` and
`totalPages` still describe the full result set.

## Errors

An invalid `modality`, `status`, `page`, `pageSize`, or `sort` returns `400` with this body. Every
invalid parameter is reported, not only the first one.

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

| Field | Meaning |
| --- | --- |
| `error.code` | Always `INVALID_QUERY_PARAMETER` for query validation failures. |
| `error.message` | Constant, caller-facing summary. |
| `error.details` | One entry per rejected parameter, in the order the parameters are validated. |

### Validation messages

| Parameter | Message |
| --- | --- |
| `modality` | `modality must be one of online, in-person, hybrid.` |
| `status` | `status must be one of draft, active, retired.` |
| `sort` | `sort must be one of title, createdAt, updatedAt.` |
| `page` | `page must be an integer greater than or equal to 1.` |
| `pageSize` | `pageSize must be between 1 and 50.` |

## Data source

The scaffold has no provisioned database, so the catalog is served from a deterministic fixture of
14 courses in `@axc/persistence`. It spans every modality and every status, reuses tags across
courses, and includes a mixed-case `Security` tag so case-insensitive matching is exercisable. With
the default page size of 10, the fixture spans two pages.

Swapping in a real data source means providing another implementation of the `CourseReadRepository`
contract in `@axc/domain` and injecting it from `@apps/api`. Nothing in the route or the use case
changes.

## Examples

```bash
# Default page
curl -s https://api.agentcourses.localhost/api/courses

# Case-insensitive keyword search
curl -s 'https://api.agentcourses.localhost/api/courses?q=SECURITY&pageSize=50'

# Combined filters
curl -s 'https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active'

# Second page of five, newest-created last
curl -s 'https://api.agentcourses.localhost/api/courses?page=2&pageSize=5&sort=createdAt'
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`.

# Courses

`GET /api/courses` searches the training course catalog. The catalog is a read
model served by `@axc/application-services` and exposed through the Hono route in
`@axc/rest`. The route is anonymous and read-only.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

### Query parameters

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `q` | string | — | Case-insensitive substring match against `title`, `summary`, and any `tag`. |
| `modality` | enum | — | One of `online`, `in-person`, `hybrid`. Compared case-insensitively. |
| `status` | enum | — | One of `draft`, `active`, `retired`. Compared case-insensitively. |
| `tag` | string | — | Case-insensitive match against a **whole** tag. `secur` does not match `security`. |
| `page` | integer | `1` | Must be an integer of 1 or more. A page past the end returns an empty `items` array. |
| `pageSize` | integer | `10` | Must be between 1 and 50. |
| `sort` | enum | `title` | One of `title`, `createdAt`, `updatedAt`. Always ascending, with `id` as a stable tie-breaker. |

Filters combine with AND. Blank values (`?tag=`) are treated as absent. Unknown
parameters are ignored.

## Success response

`200` with a page of courses and its pagination metadata:

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
| `page` | The page that was served, echoing the request. |
| `pageSize` | The page size that was applied. |
| `totalItems` | Courses matching the filters across every page. |
| `totalPages` | `ceil(totalItems / pageSize)`. `0` when nothing matches. |

### Course

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique course id. |
| `title` | string | Human-readable title. |
| `summary` | string | Short description. |
| `modality` | enum | `online`, `in-person`, or `hybrid`. |
| `status` | enum | `draft`, `active`, or `retired`. |
| `tags` | string[] | Lower-case searchable tags. |
| `createdAt` | string | ISO-8601 instant. |
| `updatedAt` | string | ISO-8601 instant. |

A search with no matches is **not** an error. It returns `200` with
`"items": []`, `"totalItems": 0`, and `"totalPages": 0`.

## Error response

`400` when one or more query parameters are invalid. Every violation is reported
in a single response so a client sees all of its mistakes at once.

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
| `modality` | `modality must be one of online, in-person, hybrid.` |
| `status` | `status must be one of draft, active, retired.` |
| `sort` | `sort must be one of title, createdAt, updatedAt.` |
| `page` | `page must be an integer greater than or equal to 1.` |
| `pageSize` | `pageSize must be between 1 and 50.` |

## Examples

```bash
curl -s 'https://api.agentcourses.localhost/api/courses?q=security&pageSize=50'
curl -s 'https://api.agentcourses.localhost/api/courses?modality=hybrid&status=active'
curl -s 'https://api.agentcourses.localhost/api/courses?tag=ai&sort=createdAt'
curl -s -o /dev/null -w '%{http_code}' 'https://api.agentcourses.localhost/api/courses?pageSize=51'
```

## Data

The catalog is seeded from a fixed 14-course fixture
(`courseCatalogFixture` in `@axc/application-services`) covering every modality,
every status, and overlapping tags. See
[the read model decision record](./decisions/0001-course-catalog-read-model.md)
for why.

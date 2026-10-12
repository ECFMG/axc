# Course catalog

`GET /api/courses` searches the training course catalog. The catalog is served from an
in-process fixture of 12 courses, so the endpoint needs no database or external service.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Query parameter | Type | Default | Rules |
| --- | --- | --- | --- |
| `q` | string | — | Case-insensitive substring match against `title`, `summary` and `tags`. Must not be blank. |
| `modality` | enum | — | One of `online`, `in-person`, `hybrid`. |
| `status` | enum | — | One of `draft`, `active`, `retired`. |
| `tag` | string | — | Case-insensitive exact match against any entry of `tags`. Must not be blank. |
| `page` | integer | `1` | At least `1`. |
| `pageSize` | integer | `10` | Between `1` and `50`. |
| `sort` | enum | `title` | One of `title`, `createdAt`, `updatedAt`; always ascending, ties broken by `id`. |

Unknown query parameters are ignored. Filters combine with AND; pagination is applied after
filtering and sorting.

## Success response

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
| `items` | Courses on the requested page. Empty when nothing matches — an empty result is not an error. |
| `page` | Echo of the requested page. |
| `pageSize` | Echo of the requested page size. |
| `totalItems` | Number of courses matching the filters, before pagination. |
| `totalPages` | `ceil(totalItems / pageSize)`; `0` when nothing matches. |

### Course fields

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Stable course identifier. |
| `title` | string | Course title. |
| `summary` | string | Short description. |
| `modality` | enum | `online`, `in-person` or `hybrid`. |
| `status` | enum | `draft`, `active` or `retired`. |
| `tags` | string[] | Searchable tags. |
| `createdAt` | string | ISO-8601 creation time. |
| `updatedAt` | string | ISO-8601 last-update time. |

## Error response

Any invalid query parameter returns `400` with every offending parameter listed once:

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

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&status=active"
```

## Design decisions

- **Storage is an in-memory fixture** (`@axc/persistence`), behind a `CourseRepository`
  contract. The catalog is read-only sample data; a Mongoose adapter can implement the same
  contract later without touching the REST or application-services layers.
- **Search rules live in `@axc/domain`** (`matchesCriteria`, `compareCourses`) because they are
  pure predicates, **validation lives in `@axc/application-services`** (`parseCourseSearchQuery`),
  and `@axc/rest` only maps the outcome to `200` or `400`.

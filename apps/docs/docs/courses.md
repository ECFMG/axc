# Course Catalog

`GET /api/courses` searches the training course catalog. The catalog is an in-memory
seed fixture composed by `@axc/application-services`, so the endpoint runs with no
database or external service.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

## Query parameters

All parameters are optional.

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `q` | string | — | Case-insensitive substring match against `title`, `summary` and `tags`. |
| `modality` | enum | — | One of `online`, `in-person`, `hybrid`. |
| `status` | enum | — | One of `draft`, `active`, `retired`. |
| `tag` | string | — | Matches a course whose `tags` contain this exact tag, case-insensitively. |
| `page` | integer | `1` | Must be `1` or greater. |
| `pageSize` | integer | `10` | Must be between `1` and `50`. |
| `sort` | enum | `title` | One of `title`, `createdAt`, `updatedAt`. Always ascending, with `id` as the tiebreaker. |

Filters combine with AND. Blank values (`?q=`) are treated as absent. Unknown
parameters are ignored.

## Course

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique course ID. |
| `title` | string | Human-readable title. |
| `summary` | string | Short description. |
| `modality` | enum | `online`, `in-person` or `hybrid`. |
| `status` | enum | `draft`, `active` or `retired`. |
| `tags` | string[] | Searchable tags. |
| `createdAt` | string | ISO-8601 date string. |
| `updatedAt` | string | ISO-8601 date string. |

## Success response

`200` with a paginated envelope. `totalPages` is `ceil(totalItems / pageSize)`, so a
query that matches nothing returns `items: []` with `totalItems: 0` and
`totalPages: 0` — not an error.

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

## Error response

`400` when any parameter fails validation. Every invalid parameter is reported, not
just the first.

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

| Parameter | Message |
| --- | --- |
| `modality` | `modality must be one of online, in-person, hybrid.` |
| `status` | `status must be one of draft, active, retired.` |
| `sort` | `sort must be one of title, createdAt, updatedAt.` |
| `page` | `page must be an integer greater than or equal to 1.` |
| `pageSize` | `pageSize must be between 1 and 50.` |

## Example

```bash
curl -s 'https://api.agentcourses.localhost/api/courses?modality=online&status=active'
```

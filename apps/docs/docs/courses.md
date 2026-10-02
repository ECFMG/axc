# Courses

`GET /api/courses` searches the training course catalog. The catalog is served from an
in-memory fixture (12 courses), so the endpoint needs no database or external service.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

### Query parameters

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `q` | string | — | Case-insensitive substring match against `title`, `summary`, and `tags`. |
| `modality` | enum | — | One of `online`, `in-person`, `hybrid`. |
| `status` | enum | — | One of `draft`, `active`, `retired`. |
| `tag` | string | — | Matches a course whose `tags` contain the value, case-insensitively. |
| `page` | integer | `1` | Must be an integer `>= 1`. |
| `pageSize` | integer | `10` | Must be an integer between `1` and `50`. |
| `sort` | enum | `title` | One of `title`, `createdAt`, `updatedAt`; always ascending. |

Omitted or empty parameters are ignored. Unknown parameters are ignored. Filters combine with
AND; all filters are applied before sorting and pagination.

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
| `items` | Courses on the requested page. Empty array when nothing matches — not an error. |
| `page` | Echo of the effective page. |
| `pageSize` | Echo of the effective page size. |
| `totalItems` | Matching courses across all pages. |
| `totalPages` | `ceil(totalItems / pageSize)`; `0` when there are no matches. |

### Course fields

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

## Error response

Any invalid query parameter returns `400` with every offending parameter listed:

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
| `error.code` | Always `INVALID_QUERY_PARAMETER`. |
| `error.message` | Always `One or more query parameters are invalid.`. |
| `error.details` | One `{ field, message }` entry per invalid parameter, ordered `modality`, `status`, `sort`, `page`, `pageSize`. |

## Example

```bash
curl -s 'https://api.agentcourses.localhost/api/courses?q=security&status=active&sort=createdAt'
```

# Courses

`GET /api/courses` searches the training course catalog. Results are filtered, sorted, and paginated on the server.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

Every query parameter is optional. Each may appear at most once; unknown parameters are rejected.

| Parameter | Type | Default | Rules |
| --- | --- | --- | --- |
| `q` | string | none | Keyword matched case-insensitively against `title`, `summary`, and `tags` (substring match, taken literally). Empty means no keyword filter. |
| `modality` | enum | none | `online`, `in-person`, or `hybrid`. |
| `status` | enum | none | `draft`, `active`, or `retired`. |
| `tag` | string | none | Courses whose `tags` contain this tag, compared case-insensitively. Empty means no tag filter. |
| `page` | integer | `1` | 1 or greater. A page past the last one returns an empty `items` array. |
| `pageSize` | integer | `10` | Between 1 and 50. |
| `sort` | enum | `title` | `title` (alphabetical, case-insensitive), `createdAt`, or `updatedAt`. All sorts are ascending. |

Filters combine with AND.

## Success response

`200` with this JSON body:

```json
{
  "items": [
    {
      "id": "650000000000000000000001",
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
| `items` | The courses on this page. Empty (not an error) when nothing matches. |
| `page`, `pageSize` | The page that was returned. |
| `totalItems` | Number of courses matching the filters across all pages. |
| `totalPages` | `ceil(totalItems / pageSize)`; `0` when nothing matches. |

### Course fields

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique course ID (24-character hex). Use it as `courseId` when [requesting enrollment](./enrollment-requests.md). |
| `title` | string | Human-readable title. |
| `summary` | string | Short description. |
| `modality` | enum | `online`, `in-person`, `hybrid`. |
| `status` | enum | `draft`, `active`, `retired`. Only `active` courses accept enrollment requests. |
| `tags` | string[] | Lowercase tags. |
| `createdAt`, `updatedAt` | string | ISO-8601 timestamps. |

## Error response

`400` when any query parameter is invalid. Every invalid parameter is listed in `details`.

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [
      {
        "field": "pageSize",
        "message": "pageSize must be an integer between 1 and 50."
      }
    ]
  }
}
```

| Cause | `field` |
| --- | --- |
| `modality` not one of the allowed values | `modality` |
| `status` not one of the allowed values | `status` |
| `sort` not one of the allowed values | `sort` |
| `page` not a positive integer | `page` |
| `pageSize` not an integer between 1 and 50 | `pageSize` |
| Unknown or repeated parameter | the parameter name |

## Examples

```bash
# Default page: first 10 courses sorted by title
curl -s https://api.agentcourses.localhost/api/courses

# Active online courses about security, oldest first
curl -s 'https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active&sort=createdAt'
```

## Seed data

Local and test runs (no `MONGODB_CONNECTION_STRING`) start an in-process MongoDB replica set seeded with 14 courses covering every modality and status. Seeded ids are `650000000000000000000001` to `650000000000000000000014`.

# Course catalog

`GET /api/courses` searches the training course catalog by keyword, modality, status, and tag, with pagination and sorting.

The route is served by `@axc/rest`. Validation, filtering, sorting, and pagination happen in `@axc/application-services`. The courses come from an in-memory seed of 16 courses in `@axc/persistence`, which `@apps/api` wires in at startup. No database or external service is involved.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

Every parameter is optional.

| Parameter | Type | Allowed values | Default | Matching |
| --- | --- | --- | --- | --- |
| `q` | string | Up to 200 characters after trimming | none | Case-insensitive substring match against the title, the summary, or any tag. Leading and trailing spaces are trimmed. An empty or whitespace-only value is ignored. |
| `modality` | enum | `online`, `in-person`, `hybrid` | none | Exact match. Values are case-sensitive. |
| `status` | enum | `draft`, `active`, `retired` | none | Exact match. Values are case-sensitive. |
| `tag` | string | Up to 200 characters after trimming | none | Case-insensitive match against a whole tag. `tag=ai` matches the tag `AI` but not `ai-ethics`. Trimmed and ignored when empty, like `q`. |
| `page` | integer | Digits only, `1` or more | `1` | 1-based page number. |
| `pageSize` | integer | Digits only, `1` to `50` | `10` | Number of items per page. |
| `sort` | enum | `title`, `createdAt`, `updatedAt` | `title` | Sort field. Values are case-sensitive. |

Rules that apply to every parameter:

- Filters are combined with AND. A course is returned only when it matches every filter given.
- Parameter names are case-sensitive. Any other name, such as `category` or `pagesize`, is rejected.
- Each parameter may appear at most once. `?page=1&page=2` is rejected.
- All invalid parameters are reported together in one response.

## Sorting

Results are always sorted in ascending order.

| `sort` | Order |
| --- | --- |
| `title` | Alphabetical, ignoring case. |
| `createdAt` | Oldest first. |
| `updatedAt` | Least recently updated first. |

Courses that tie on the sort field are ordered by `id`, ascending, so the order is stable from page to page.

## Success response

`200` with this JSON body. The example is the response to the request above without `tag=ai`, that is `GET /api/courses?q=security&modality=online&status=active&page=1&pageSize=5&sort=title`.

```json
{
  "items": [
    {
      "id": "course-001",
      "title": "AI Security Foundations",
      "summary": "Threat modeling, prompt injection, and data protection for AI-enabled systems.",
      "modality": "online",
      "status": "active",
      "tags": ["ai", "security"],
      "createdAt": "2026-01-15T00:00:00.000Z",
      "updatedAt": "2026-06-01T00:00:00.000Z"
    },
    {
      "id": "course-016",
      "title": "Application Security Testing",
      "summary": "Static analysis, dependency scanning, and penetration testing for web APIs.",
      "modality": "online",
      "status": "active",
      "tags": ["security", "testing"],
      "createdAt": "2024-09-23T08:45:00.000Z",
      "updatedAt": "2025-06-05T10:20:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 2,
  "totalPages": 1
}
```

| Field | Meaning |
| --- | --- |
| `items` | The courses on the requested page, in sort order. At most `pageSize` items. |
| `page` | The requested page. |
| `pageSize` | The requested page size. |
| `totalItems` | The number of courses that match the filters, across all pages. |
| `totalPages` | `ceil(totalItems / pageSize)`. `0` when nothing matches. |

Each course has these fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Unique course ID. |
| `title` | string | Human-readable title. |
| `summary` | string | Short description. |
| `modality` | string | `online`, `in-person`, or `hybrid`. |
| `status` | string | `draft`, `active`, or `retired`. |
| `tags` | string[] | Searchable tags. |
| `createdAt` | string | ISO-8601 creation time. |
| `updatedAt` | string | ISO-8601 time of the last update. |

### No matches

A search that matches nothing is not an error. It returns `200` with an empty `items` array:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 10,
  "totalItems": 0,
  "totalPages": 0
}
```

A `page` past the last page also returns `200` with an empty `items` array. `totalItems` and `totalPages` still describe the full result, so a client can tell it went too far.

## Error response

Invalid query parameters return `400` with this JSON body. `details` lists one entry per invalid parameter.

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

`code` and `message` are always the values shown. The possible `details` messages are:

| `field` | `message` | When |
| --- | --- | --- |
| `q` | `q must be at most 200 characters.` | `q` is longer than 200 characters after trimming. |
| `modality` | `modality must be one of: online, in-person, hybrid.` | Any other value, including an empty one. |
| `status` | `status must be one of: draft, active, retired.` | Any other value, including an empty one. |
| `tag` | `tag must be at most 200 characters.` | `tag` is longer than 200 characters after trimming. |
| `page` | `page must be a positive integer.` | Not digits only (for example `abc`, `1.5`, `-1`, `+1`, or empty), `0`, or too large to be a safe integer. |
| `pageSize` | `pageSize must be between 1 and 50.` | Not digits only, or outside 1 to 50. |
| `sort` | `sort must be one of: title, createdAt, updatedAt.` | Any other value, including an empty one. |
| any supported name | `<field> must be specified at most once.` | The parameter appears more than once. |
| the unknown name | `<name> is not a supported query parameter.` | The name is not one of the seven above. |

Errors are listed in this order: `q`, `modality`, `status`, `tag`, `page`, `pageSize`, `sort`, then unknown parameters in the order they appear in the request.

For example, `GET /api/courses?sort=name&modality=remote&pageSize=100` returns:

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [
      { "field": "modality", "message": "modality must be one of: online, in-person, hybrid." },
      { "field": "pageSize", "message": "pageSize must be between 1 and 50." },
      { "field": "sort", "message": "sort must be one of: title, createdAt, updatedAt." }
    ]
  }
}
```

## Example

```bash
curl -s 'https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active&pageSize=5'
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`. A git worktree named `feature-a` uses `https://api.agentcourses.feature-a.localhost` when `WORKTREE_NAME=feature-a`.

# Course catalog search

`GET /api/courses` searches a local sample catalog of 12 courses. No external
service or production data is required. The API composition root injects the
application service into Hono and registers the Azure Functions HTTP handler.

## Query parameters

All filters combine with AND. Each parameter may appear only once. Unknown
parameters return HTTP 400.

| Parameter | Values and behavior | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring of title, summary, or any tag. Surrounding whitespace is removed. Empty text means no keyword filter. | No filter |
| `modality` | `online`, `in-person`, `hybrid` (case-sensitive) | No filter |
| `status` | `draft`, `active`, `retired` (case-sensitive) | No filter |
| `tag` | Case-insensitive exact tag. Surrounding whitespace is removed; an empty tag matches no course. | No filter |
| `page` | Positive safe integer written as decimal digits, starting at 1 | `1` |
| `pageSize` | Integer from 1 to 50, written as decimal digits | `10` |
| `sort` | `title`, `createdAt`, `updatedAt` (case-sensitive) | `title` |

Sorting is ascending, before pagination. Titles use lowercase lexical ordering;
dates are ISO strings. Equal sort values use course ID as a stable tie-breaker.
`totalItems` counts all filtered courses, and `totalPages` is
`ceil(totalItems / pageSize)`. A page past the end returns an empty `items` array
with the requested page and the filtered totals. No matches return HTTP 200,
empty `items`, `totalItems: 0`, and `totalPages: 0`.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=AI&page=1&pageSize=5&sort=title
```

## Success response

HTTP 200 with `application/json`:

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
      "createdAt": "2025-12-15T00:00:00.000Z",
      "updatedAt": "2026-01-20T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

Each course includes a unique string `id`, `title`, `summary`, `modality`,
`status`, string array `tags`, and ISO timestamps `createdAt` and `updatedAt`.

## Error response

Invalid enums, empty or malformed numbers, unsafe integers, page sizes above 50,
duplicate parameters, and unknown parameters return HTTP 400. Multiple invalid
fields are reported together using the same envelope:

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

## Local validation

From the repository root, run `pnpm run build --env-mode=loose`, then
`pnpm --filter @axc-verification/acceptance-api test` for focused
application-service and Hono integration checks. `pnpm test --env-mode=loose`
also runs these checks in their owning verification package and existing health acceptance
checks through the Azure Functions host.

The fixtures are read-only sample data. Persistence and catalog editing are
outside Task A's scope. Returned records are copied to isolate requests.

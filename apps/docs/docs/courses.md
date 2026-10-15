# Course catalog search

`GET /api/courses` returns the local sample training catalog. No external service or database is needed. The catalog contains 12 fixed courses spanning all modalities and statuses. This sample endpoint includes drafts and retired courses unless filtered.

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

## Query parameters

| Parameter | Values and behavior | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring search across title, summary, and each tag. | No keyword filter |
| `modality` | `online`, `in-person`, `hybrid` (case-sensitive). | All modalities |
| `status` | `draft`, `active`, `retired` (case-sensitive). | All statuses |
| `tag` | Case-insensitive exact tag match. | All tags |
| `page` | Positive safe integer, written as decimal digits. | `1` |
| `pageSize` | Integer from `1` through `50`, written as decimal digits. | `10` |
| `sort` | `title`, `createdAt`, `updatedAt` (case-sensitive). | `title` |

All supplied filters combine using AND. Keyword and tag values are trimmed; empty or whitespace-only values mean no filter. Empty enum and pagination values are invalid. Unknown parameters and repeated parameters return HTTP 400. Signed, fractional, exponential, hexadecimal, non-finite, and unsafe integer pagination values are invalid.

Sorting is ascending, before pagination. Title comparison is case-insensitive using lexical order. ISO dates sort chronologically. Equal values use course ID as a deterministic tie-breaker. Pagination metadata counts filtered results. A page beyond the end returns an empty `items` array and preserves the requested page. No matches return HTTP 200 with `totalItems: 0` and `totalPages: 0`.

## Success response

HTTP 200, `application/json`:

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
      "updatedAt": "2027-12-01T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

Each course includes a unique string `id`, `title`, `summary`, `modality`, `status`, string-array `tags`, and ISO timestamp strings `createdAt` and `updatedAt`.

## Error response

HTTP 400, `application/json`, for example `GET /api/courses?pageSize=51`:

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

Multiple invalid fields appear together in `details`.

## Implementation and local validation

The application-services package owns the Course contract, static fixture catalog, and stateless search. The Hono REST package handles HTTP responses. The API composition root registers the courses Azure Function alongside health. No authentication behavior, deployment settings, or vendored Cellix source changes are required.

From the repository root, restore locked dependencies, then run:

```sh
pnpm test --env-mode=loose
pnpm run lint
pnpm run build --env-mode=loose
pnpm run typecheck --env-mode=loose
pnpm run test:arch --env-mode=loose
```

The default test command includes application-service unit tests and Hono/adapter integration tests. After a build, `pnpm --filter @apps/api test` runs the endpoint integration tests alone. The sample catalog is read-only and process-local; persistence and write endpoints are outside this task.

# Course catalog search

`GET /api/courses` searches a fixed local catalog of twelve courses. Filters combine with AND. No database, account, credentials or external service is required for this read-only fixture catalog. The endpoint uses the application's existing anonymous route convention; authentication behavior elsewhere is unchanged.

## Query parameters

| Parameter | Behavior | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring search within title, summary or any tag. Whitespace is trimmed. An empty keyword imposes no keyword filter. | None |
| `modality` | Exactly `online`, `in-person` or `hybrid`. | Any |
| `status` | Exactly `draft`, `active` or `retired`. | Any |
| `tag` | Case-insensitive whole-tag match, with surrounding whitespace trimmed. An empty tag matches no fixtures. | Any |
| `page` | Positive safe integer, written as decimal digits. | `1` |
| `pageSize` | Integer from `1` to `50`, written as decimal digits. | `10` |
| `sort` | `title`, `createdAt` or `updatedAt`. Ascending; title compares case-insensitively. Equal values use ascending ID as a stable tie-break. | `title` |

Repeated recognized parameters return 400. Unknown parameters are ignored. Enum values are case-sensitive. Negative, fractional, scientific-notation, whitespace-padded and unsafe integer values are rejected. Pages beyond the final page return empty items with the requested page and correct totals.

## Success response

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

HTTP 200, `Content-Type: application/json`:

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

Every course has all eight fields above. IDs are unique. Dates are UTC ISO strings. `totalItems` counts matches before pagination; `totalPages` is the ceiling of total items divided by page size.

No matches return HTTP 200:

```json
{"items": [], "page": 1, "pageSize": 10, "totalItems": 0, "totalPages": 0}
```

## Error response

Invalid `modality`, `status`, `page`, `pageSize` or `sort` values return HTTP 400. Validation runs even when other filters would produce no matches. Multiple errors can be included in `details`.

For `GET /api/courses?pageSize=51`:

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [
      {"field": "pageSize", "message": "pageSize must be between 1 and 50."}
    ]
  }
}
```

## Local use and tests

From the repository root, use the existing Node 24+ and pnpm setup. Install the existing lockfile with `pnpm install --frozen-lockfile`. Start the API using the documented local development workflow, then request:

```sh
curl 'http://127.0.0.1:7071/api/courses?tag=ai'
pnpm test
pnpm run lint
pnpm run build
pnpm run typecheck
pnpm run test:arch
```

The `@apps/api` tests exercise the actual Hono app in memory after workspace dependencies build; they need no listening port or Azure Functions host. Cucumber scenarios separately exercise the host through HTTP. See [implementation notes](courses-implementation.md) for scope and limitations.

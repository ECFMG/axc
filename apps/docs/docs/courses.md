# Course catalog

`GET /api/courses` searches the sample training catalog. No authentication is required.

| Parameter | Accepted input | Default |
| --- | --- | --- |
| `q` | Literal substring in title, summary, or any tag, case-insensitively | Absent |
| `modality` | `online`, `in-person`, `hybrid` | All |
| `status` | `draft`, `active`, `retired` | All |
| `tag` | Exact tag, case-insensitively | All |
| `page` | Positive decimal whole number, up to 9007199254740991 | 1 |
| `pageSize` | Decimal whole number from 1 to 50 | 10 |
| `sort` | `title`, `createdAt`, `updatedAt` | `title` |

Filters combine with AND; `q` matches any of the three searchable fields. Surrounding
whitespace is trimmed; empty or whitespace-only parameters count as absent. Unknown
parameters are ignored. For repeated parameters the first value is used. Enum values
are case-sensitive. Sorting is ascending (MongoDB binary ordering for titles), with
course ID as a stable tie breaker. Dates are ISO strings in UTC. Out-of-range pages
and searches with no matches return 200 with empty items; no matches means zero total pages.

Example:

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

HTTP 200:

```json
{
  "items": [{
    "id": "course-001",
    "title": "AI Security Foundations",
    "summary": "Introductory course on secure AI-assisted development.",
    "modality": "online",
    "status": "active",
    "tags": ["ai", "security"],
    "createdAt": "2026-01-12T00:00:00.000Z",
    "updatedAt": "2026-06-01T00:00:00.000Z"
  }],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

Invalid parameters, such as `pageSize=51`, return HTTP 400. All detected field errors
appear in the same response shape:

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [{"field": "pageSize", "message": "pageSize must be between 1 and 50."}]
  }
}
```

Unexpected storage failures return HTTP 500 with
`{"error":{"code":"INTERNAL_SERVER_ERROR","message":"Unable to retrieve courses."}}`.

The composition root requires MongoDB storage. With no configured `MONGODB_URI`, startup
uses local MongoDB 7.0.14 and idempotently seeds twelve fixtures spanning all modalities
and statuses. This database is discarded at shutdown. The first local run needs the
MongoDB binary in the machine cache or a binary download. A configured database is never
seeded automatically. See [the storage decision](adr/0001-course-catalog-storage.md).

Workspace dependency additions reuse existing packages and catalog versions: MongoDB
and Cellix model wiring, plus the repository's Vitest/Gherkin tools in newly tested
packages. No new third-party package or package version was introduced.

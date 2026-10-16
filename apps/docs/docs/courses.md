---
id: courses
title: Course catalog search
---

`GET /api/courses` searches the sample training catalog. All filters combine with AND; a keyword may match any searchable field.

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Parameter | Accepted input | Default |
| --- | --- | --- |
| `q` | Case-insensitive literal substring in title, summary, or any tag | No keyword filter |
| `modality` | `online`, `in-person`, `hybrid` (case-sensitive) | All modalities |
| `status` | `draft`, `active`, `retired` (case-sensitive) | All statuses |
| `tag` | Case-insensitive exact tag, not a substring | All tags |
| `page` | Positive integer, decimal digits only | `1` |
| `pageSize` | Integer from `1` to `50`, decimal digits only | `10` |
| `sort` | `title`, `createdAt`, `updatedAt` | `title` |

Sorting is ascending, with course ID as a stable tie breaker. Title sorting uses MongoDB's default binary ordering. Dates sort chronologically. Numbers must be safely representable integers; signs, fractions, exponents, and surrounding whitespace are invalid. Text filters and enum inputs are trimmed. Empty or whitespace-only optional parameters use their defaults. Unknown query parameters are ignored; repeated parameters use their first value.

A successful response is HTTP 200:

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
      "createdAt": "2026-02-15T00:00:00.000Z",
      "updatedAt": "2026-12-20T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

`totalItems` counts all matches before pagination. `totalPages` is the matching count divided by page size, rounded up. No matches return HTTP 200 with `items: []`, `totalItems: 0`, and `totalPages: 0`. A page past the last page returns an empty list while retaining matching totals.

Invalid parameters return HTTP 400. All detected validation errors use the same envelope:

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

Storage or application failures return HTTP 500 with `{"error":{"code":"INTERNAL_ERROR","message":"Unable to search courses."}}`; internal errors are never included.

The read-only Course reference and allowed values live in the catalog domain. Application services forward typed criteria to a MongoDB read repository, which performs filtering, sorting, counting, and paging. REST owns query parsing and HTTP error mapping.

The composition root registers `ServiceMongoose`. When `MONGODB_URI` is absent, it starts MongoDB `7.0.14` in memory and inserts 12 varied courses before serving catalog requests. The binary must already be cached for offline runs. The local database is disposable and stopped at shutdown. A configured URI is connected directly and is never seeded. No authentication or deployment settings are changed.

Added dependencies are existing workspace domain/persistence/infrastructure packages plus the repository's existing test tools: Vitest, its configuration/coverage package, Gherkin bindings, Node types, and MongoDB memory server for persistence tests. No new third-party runtime library is introduced beyond the existing Mongoose stack.

The catalog is a sample implementation: substring regex searches may scan the collection; no search index, write API, or transactional snapshot across count and page queries is provided.

# Course catalog

`GET /api/courses` searches the sample training catalog. The API uses 12 deterministic in-memory fixtures with all modalities and statuses. It requires no external service or production data. The composition root supplies the repository; application services own filtering, sorting and pagination; REST owns query validation.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Parameter | Behavior | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring search across title, summary and each tag. | No keyword filter |
| `modality` | Exactly `online`, `in-person`, or `hybrid`. | All modalities |
| `status` | Exactly `draft`, `active`, or `retired`. | All statuses |
| `tag` | Case-insensitive match to an entire tag. | No tag filter |
| `page` | Positive safe integer, at most 9007199254740991. | `1` |
| `pageSize` | Integer from 1 through 50. | `10` |
| `sort` | Exactly `title`, `createdAt`, or `updatedAt`. | `title` |

Filters combine with AND. Keyword and tag values are trimmed. Empty or whitespace-only optional values are treated as absent. Enum values are case-sensitive. Integers use decimal digits without signs, leading zeros, fractions, exponent notation or surrounding spaces. Unknown parameters and repeated parameters return 400.

Sorting is ascending before pagination. Titles use English collation; dates use chronological order. Equal sort values are ordered by course ID. `totalItems` counts all filtered results, and `totalPages` is the ceiling of that count divided by `pageSize`. No matches return 200 with `items: []`, `totalItems: 0`, and `totalPages: 0`. Pages beyond the results return an empty array while preserving the filtered totals.

## Success response

`200 application/json` for the request above:

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

Each course has a unique string `id`, string `title` and `summary`, the modality and status enums above, a string array `tags`, and ISO date strings `createdAt` and `updatedAt`.

## Error response

`GET /api/courses?pageSize=51` returns `400 application/json`:

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

Independent validation failures are reported together in `details`.

## Verification coverage

| Requirements | Coverage |
| --- | --- |
| Course fields and at least 12 mixed fixtures | `persistence/src/courses.test.ts` |
| A1, A-AC1 | REST route, API function registration, acceptance default-list scenario |
| A2–A6, A-AC2–A-AC5 | Application service unit tests; acceptance keyword, enum, tag and combined-filter scenarios |
| A7, A-AC6 | Application service pagination tests, REST defaults and numeric-boundary tests, acceptance pagination scenarios |
| A8, A-AC7 | Unit and acceptance tests for all three sort fields |
| A9, A-AC8 | REST rejection tests; acceptance invalid-query scenarios |
| A-AC9 | Unit and acceptance no-match and out-of-range-page tests |
| A10, A-AC10, A-AC11 | Existing healthcheck, architecture tests, new unit and acceptance suites |
| A11, A-AC12 | This endpoint, parameter and response documentation |

The in-memory repository reads the whole sample catalog; filtering and sorting happen in application services. A larger catalog would need a persistent query implementation. No new external libraries are required: package links and test tooling reuse existing workspace packages and installed versions.

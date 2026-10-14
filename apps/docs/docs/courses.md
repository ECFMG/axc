---
sidebar_label: Course catalog
---

# Course catalog search

`GET /api/courses` searches a deterministic, read-only sample of 12 courses. No external service or production data is required. Azure Functions registers `api/courses` because the host has an empty route prefix.

| Parameter | Meaning | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring in title, summary, or any tag | All courses |
| `modality` | `online`, `in-person`, `hybrid` | All modalities |
| `status` | `draft`, `active`, `retired` | All statuses |
| `tag` | Case-insensitive exact tag match | All tags |
| `page` | Positive decimal integer, at most 180143985094819 | `1` |
| `pageSize` | Decimal integer from 1 through 50 | `10` |
| `sort` | `title`, `createdAt`, `updatedAt` | `title` |

All filters are combined with AND. Sorting is ascending; equal keys are ordered by ID. Titles use deterministic Unicode string ordering, and timestamps use ISO chronological order. Filtering and sorting precede pagination. `totalItems` counts all filtered courses, and `totalPages` is the ceiling of that count divided by page size. No matches return HTTP 200 with zero totals and an empty array. Pages beyond the result set return an empty array with the original totals.

Empty `q` and `tag` values apply no filter. Enum values are case-sensitive. Parameters must occur once; unknown parameters, empty enums, fractional numbers, signs, whitespace, scientific notation, and unsafe numeric offsets return HTTP 400. Leading zeros in decimal pagination values are accepted. No trimming is applied to keyword or tag strings.

## Example

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

HTTP 200:

```json
{
  "items": [{
    "id": "course-001",
    "title": "AI Security Foundations",
    "summary": "Secure AI-assisted development.",
    "modality": "online",
    "status": "active",
    "tags": ["ai", "security"],
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-06-12T00:00:00.000Z"
  }],
  "page": 1,
  "pageSize": 5,
  "totalItems": 1,
  "totalPages": 1
}
```

HTTP 400 for `?pageSize=51`:

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "One or more query parameters are invalid.",
    "details": [{ "field": "pageSize", "message": "pageSize must be between 1 and 50." }]
  }
}
```

## Implementation and validation

The application service owns the Course contract, sample catalog, filtering, sorting, and pagination. This read-only sample needs no persistent repository. Results copy course records and tags so callers cannot mutate the fixture. The REST layer validates query parameters and serializes the shared error shape before invoking the service. The API entry point registers the Azure Functions route. Existing health behavior is preserved.

Endpoint tests in `apps/api/src/courses.test.ts` cover all fields, keyword match locations, each enum value, exact tags, multiple filter combinations, page boundaries, all sort fields, invalid queries, empty results, fixture isolation, the Azure adapter, route registration, and health. Run `pnpm test`, `pnpm run lint`, `pnpm run build`, `pnpm run typecheck`, and `pnpm run test:arch` from the repository root. Full acceptance tests require the existing Azure Functions Core Tools runtime. No dependencies were added.

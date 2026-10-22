# Course catalog

`GET /api/courses` searches the training course catalog. Keyword search, modality, status, and tag filters combine with AND. A search with no matches returns `200` and an empty `items` array.

The catalog is a fixed in-memory fixture of 12 courses. It is created when the API process starts and is not editable through this API. See [in-memory storage](/adr/in-memory-course-enrollment) for why the fixture is not a database.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Parameter | Required | Default | Rules |
| --- | --- | --- | --- |
| `q` | No | none | Case-insensitive substring of `title`, `summary`, or any tag. A blank value is ignored. |
| `modality` | No | none | `online`, `in-person`, or `hybrid`. |
| `status` | No | none | `draft`, `active`, or `retired`. |
| `tag` | No | none | Case-insensitive exact tag match. Must be non-empty when present. |
| `page` | No | `1` | Integer greater than or equal to 1. |
| `pageSize` | No | `10` | Integer from 1 through 50. |
| `sort` | No | `title` | `title`, `createdAt`, or `updatedAt`. Ascending. Title sort is case-insensitive. `id` breaks ties. |

Enum values are case-sensitive. Unknown query parameters are ignored.

## Successful response

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
| `items` | Courses on this page, after filtering and sorting. |
| `page` | Requested page, including a page past the end. |
| `pageSize` | Page size used for the query. |
| `totalItems` | Number of courses that matched before paging. |
| `totalPages` | `0` when `totalItems` is 0. Otherwise `ceil(totalItems / pageSize)`. |

A page past the end returns `200`, an empty `items` array, and the real `totalItems` and `totalPages`.

## Error response

Invalid values for `modality`, `status`, `tag`, `page`, `pageSize`, or `sort` return `400`.

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

Every invalid parameter is listed in `details`.

## Fixture courses

| ID | Title | Modality | Status | Tags |
| --- | --- | --- | --- | --- |
| `course-001` | AI Security Foundations | online | active | ai, security |
| `course-002` | Security Operations Lab | in-person | active | security, operations |
| `course-003` | Hybrid Delivery Practicum | hybrid | active | facilitation |
| `course-004` | Draft Onboarding Outline | online | draft | onboarding |
| `course-005` | Retired Compliance Briefing | in-person | retired | compliance |
| `course-006` | Cloud Security Basics | online | active | cloud, security |
| `course-007` | Accessible Content Design | hybrid | draft | accessibility, design |
| `course-008` | Workshop Facilitation | in-person | active | facilitation |
| `course-009` | Data Privacy Essentials | online | retired | privacy, staff-only |
| `course-010` | Hybrid Team Leadership | hybrid | active | leadership |
| `course-011` | Secure Coding Clinic | online | active | development |
| `course-012` | Archive Tag Sampler | in-person | draft | AI, catalog-sample |

`course-001` is active and can accept enrollment requests. `course-004` is draft and `course-005` is retired, so enrollment requests for them are rejected. Enrollment is documented in [Enrollment requests](/api/enrollment-requests).

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active&tag=ai"
```

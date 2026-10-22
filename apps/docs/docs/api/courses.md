# Course search

`GET /api/courses` returns a page of training courses from the in-memory catalog. The catalog is seeded with 12 courses when the API process starts.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Query parameter | Required | Default | Rule |
| --- | --- | --- | --- |
| `q` | No | none | Case-insensitive substring match against `title`, `summary`, or any tag. A blank value is ignored. |
| `modality` | No | none | `online`, `in-person`, or `hybrid`. |
| `status` | No | none | `draft`, `active`, or `retired`. |
| `tag` | No | none | Exact tag match, case-insensitive. |
| `page` | No | `1` | Integer greater than or equal to 1. |
| `pageSize` | No | `10` | Integer from 1 through 50. |
| `sort` | No | `title` | `title`, `createdAt`, or `updatedAt`. Sort order is ascending. |

Unknown query parameters, repeated parameters, and values outside those rules return HTTP 400. Filters combine with AND. A page past the end returns HTTP 200 with an empty `items` array and the real totals.

## Successful response

`200` with this JSON body. Against the seeded catalog, the example request above returns one course:

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
| `items` | Courses on this page. Empty when nothing matches. |
| `page` | Requested page number. |
| `pageSize` | Requested page size. |
| `totalItems` | Matching courses before paging. |
| `totalPages` | `0` when `totalItems` is `0`. Otherwise `ceil(totalItems / pageSize)`. |

Calling `GET /api/courses` with no query returns page 1, page size 10, sorted by title. The seed has 12 courses, so that response has `totalItems` 12 and `totalPages` 2.

### Seeded catalog

| ID | Title | Modality | Status | Tags |
| --- | --- | --- | --- | --- |
| `course-001` | AI Security Foundations | online | active | ai, security |
| `course-002` | Classroom Leadership Lab | in-person | active | leadership |
| `course-003` | Cloud Security Workshop | hybrid | draft | security, cloud |
| `course-004` | Data Privacy Essentials | online | retired | privacy |
| `course-005` | Hybrid Facilitation Studio | hybrid | active | facilitation |
| `course-006` | In-Person Incident Response | in-person | active | security, incident |
| `course-007` | Online Writing for Engineers | online | active | writing |
| `course-008` | Product Strategy with AI | hybrid | active | AI, product |
| `course-009` | Retired Onboarding Seminar | in-person | retired | onboarding |
| `course-010` | Secure Coding Draft | online | draft | security, coding |
| `course-011` | Tagging and Search Lab | online | active | search |
| `course-012` | Workplace Safety Basics | in-person | draft | safety |

## Error response

`400` when a query parameter is invalid:

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

`details` lists every invalid field on the request. No matching courses is not an error.

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`.

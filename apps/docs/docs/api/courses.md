# Course search

`GET /api/courses` returns a page of training courses from the in-memory catalog.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

Keyword search and every filter are optional. Filters combine with AND. A query that matches nothing returns `200` and an empty `items` array.

| Query | Default | Rule |
| --- | --- | --- |
| `q` | omitted | Case-insensitive substring match against `title`, `summary`, or any tag. |
| `modality` | omitted | `online`, `in-person`, or `hybrid`. |
| `status` | omitted | `draft`, `active`, or `retired`. |
| `tag` | omitted | Case-insensitive exact tag match. |
| `page` | `1` | Integer greater than or equal to 1. |
| `pageSize` | `10` | Integer from 1 through 50. |
| `sort` | `title` | `title`, `createdAt`, or `updatedAt`. Ascending. `id` breaks ties. |

## Success response

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
| `items` | Courses on this page. |
| `page` | Requested page number. |
| `pageSize` | Requested page size. |
| `totalItems` | Number of courses that match before pagination. |
| `totalPages` | `0` when `totalItems` is `0`. Otherwise `ceil(totalItems / pageSize)`. |

A page past the last page returns `200`, an empty `items` array, and the original page metadata.

## Error response

Invalid `modality`, `status`, `page`, `pageSize`, or `sort` values return `400`.

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

Repeating one of those parameters is also `400`. Unknown query parameters are ignored.

## Seeded catalog

The API process starts with these 12 courses. The catalog is in memory and returns to this list when the process restarts.

| ID | Title | Modality | Status | Tags |
| --- | --- | --- | --- | --- |
| `course-001` | AI Security Foundations | online | active | ai, security |
| `course-002` | Security Operations Lab | in-person | active | security, operations |
| `course-003` | Cloud Architecture | online | active | cloud |
| `course-004` | Data Privacy Basics | hybrid | active | privacy |
| `course-005` | AI for Analysts | online | draft | ai, analytics |
| `course-006` | Legacy Mainframe Skills | in-person | retired | legacy |
| `course-007` | Hybrid Leadership Studio | hybrid | active | leadership |
| `course-008` | Online Writing Lab | online | retired | writing |
| `course-009` | Incident Response | hybrid | draft | security, incident |
| `course-010` | In-Person Facilitation | in-person | active | teaching |
| `course-011` | Platform Engineering | online | active | platform, ai |
| `course-012` | Records Management | hybrid | retired | compliance |

`course-003` includes the word security only in its summary. `course-009` includes security only as a tag.

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&modality=online&status=active&tag=ai"
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`.

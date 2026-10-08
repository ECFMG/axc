# Course catalog

`GET /api/courses` searches the seeded training catalog. Results can be filtered, sorted, and paginated.

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

| Parameter | Required | Default | Description |
| --- | --- | --- | --- |
| `q` | No | none | Case-insensitive keyword matched against title, summary, and tags. |
| `modality` | No | none | `online`, `in-person`, or `hybrid`. |
| `status` | No | none | `draft`, `active`, or `retired`. |
| `tag` | No | none | Case-insensitive exact tag match. |
| `page` | No | `1` | 1-based page number. |
| `pageSize` | No | `10` | Page size from 1 to 50. |
| `sort` | No | `title` | `title`, `createdAt`, or `updatedAt`. |

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

A filter combination that matches no courses still returns `200` with `"items": []` and pagination metadata.

## Error response

Invalid `modality`, `status`, `page`, `pageSize`, or `sort` values return `400`:

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

## Example

```bash
curl -s "https://api.agentcourses.localhost/api/courses?q=security&modality=online&pageSize=5&sort=title"
```

# Courses

## Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

Query parameters:

| Parameter | Required | Description |
| --- | --- | --- |
| `q` | No | Case-insensitive keyword matched against title, summary, and tags |
| `modality` | No | `online`, `in-person`, or `hybrid` |
| `status` | No | `draft`, `active`, or `retired` |
| `tag` | No | Case-insensitive exact tag match |
| `page` | No | Page number, default `1` |
| `pageSize` | No | Page size, default `10`, maximum `50` |
| `sort` | No | `title`, `createdAt`, or `updatedAt`. Default `title` |

## Response

Successful responses use HTTP 200:

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

Invalid query parameters return HTTP 400:

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

```http
GET /api/courses?q=security&modality=online&status=active&page=1&pageSize=5&sort=title
```

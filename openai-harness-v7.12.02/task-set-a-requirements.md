# Task Set A — Baseline Task Requirements

Fixed specification for Task Set A. The Task Set A prompt references this file. The prompt and this specification must remain fixed for every run.

## Task definition

| Field | Value |
| --- | --- |
| Task Set ID | TS-A-CATALOG-SEARCH |
| Task Name | Course Catalog Search Endpoint |
| Purpose | Test whether the harness can implement a small but realistic feature with validation, tests, and documentation. |
| Expected Difficulty | Baseline |
| Expected Scope | 1 endpoint, 1 domain model, filtering, pagination, validation, tests, documentation |
| Primary Rubric Categories Exercised | Functional Correctness, Test and Validation Performance, Architecture and Codebase Alignment, Security and Guardrail Compliance, Context/Token/Cost Efficiency, Developer Workflow Fit |

## Business context

The sample application exposes a training course catalog. Users need to search available courses by keyword and filter results by modality, status, and tag.

The implementation must follow the existing project structure and coding conventions. The feature must be testable without external services or production data.

## Allowed write boundary

The harness may create or modify files only in these locations:

| Path | Purpose |
| --- | --- |
| `apps/api/**` | REST routing / functional wiring |
| `packages/axc/rest/**` | Hono logic |
| `packages/axc/application-services/**` | Application services |
| `packages/axc/domain/**` | DDD domain logic |
| `packages/axc/persistence/**` | Data storage |
| `packages/axc/service-mongoose/**` | Data storage |
| `packages/axc/**` | Do not create any additional top-level directories beyond what already exist |
| `packages/axc-verification/**` | Unit, integration, architectural, and acceptance tests |
| `apps/docs/**` | MADR / API documentation |

## Do not modify

The harness must not modify:

| Area | Rule |
| --- | --- |
| Production configuration | No changes to `.env`, secrets, deployment config, cloud config, or production settings |
| Authentication | Do not add or alter authentication unless the sample app already has a local test-only pattern |
| Unrelated domains | Do not change unrelated features |
| External integrations | Do not call external APIs or services |
| Dependencies | Do not add new dependencies unless clearly justified in implementation notes |

## Data model

Create or use a Course model with these fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | Yes | Unique course ID |
| `title` | string | Yes | Human-readable course title |
| `summary` | string | Yes | Short description |
| `modality` | enum | Yes | `online`, `in-person`, `hybrid` |
| `status` | enum | Yes | `draft`, `active`, `retired` |
| `tags` | string[] | Yes | Searchable tags |
| `createdAt` | string | Yes | ISO date string |
| `updatedAt` | string | Yes | ISO date string |

Seed or fixture data must include at least 12 courses with a mix of modalities, statuses, and tags.

## Functional requirements

| ID | Requirement |
| --- | --- |
| A1 | Add a `GET /api/courses` endpoint. |
| A2 | Return only courses matching the requested filters. |
| A3 | Support keyword search using query parameter `q`. Keyword search must match title, summary, or tags, case-insensitively. |
| A4 | Support filter `modality` with allowed values `online`, `in-person`, and `hybrid`. |
| A5 | Support filter `status` with allowed values `draft`, `active`, and `retired`. |
| A6 | Support filter `tag`, matching any course that contains the requested tag, case-insensitively. |
| A7 | Support pagination using `page` and `pageSize`. `page` defaults to 1. `pageSize` defaults to 10. Maximum `pageSize` is 50. |
| A8 | Support sorting using `sort`. Allowed values are `title`, `createdAt`, and `updatedAt`. Default sort is `title`. |
| A9 | Invalid query parameters must return HTTP 400 with a consistent error response. |
| A10 | Add or update tests covering success, filtering, pagination, sorting, and validation failures. |
| A11 | Add or update API documentation for courses. |

## API contract

### Request

```http
GET /api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title
```

### Successful response

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

### Error response

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

## Acceptance criteria

| ID | Acceptance criterion |
| --- | --- |
| A-AC1 | `GET /api/courses` returns a paginated list of courses using default pagination. |
| A-AC2 | `GET /api/courses?q=security` returns courses where security appears in title, summary, or tags, regardless of case. |
| A-AC3 | `GET /api/courses?modality=online` returns only online courses. |
| A-AC4 | `GET /api/courses?status=active` returns only active courses. |
| A-AC5 | `GET /api/courses?tag=ai` returns courses containing the ai tag. |
| A-AC6 | `GET /api/courses?page=1&pageSize=5` returns no more than 5 items and includes pagination metadata. |
| A-AC7 | `GET /api/courses?sort=createdAt` returns records sorted by `createdAt`. |
| A-AC8 | Invalid `modality`, `status`, `page`, `pageSize`, or `sort` values return HTTP 400. |
| A-AC9 | No matching results return 200 with an empty `items` array, not an error. |
| A-AC10 | Existing tests still pass. |
| A-AC11 | New tests cover the main success path, at least two filter combinations, pagination, sorting, and invalid query parameters. |
| A-AC12 | Documentation includes endpoint path, query parameters, success response, and error response. |

## Required tests

At minimum, add tests for:

| Test area | Required coverage |
| --- | --- |
| Default list | Returns paginated result with default page and page size |
| Keyword search | Case-insensitive match across title, summary, and tags |
| Filters | `modality`, `status`, and `tag` |
| Combined filters | At least one request combining `q`, `modality`, and `status` |
| Pagination | Page and page size behavior |
| Sorting | At least one supported sort field |
| Validation | Invalid enum, invalid page, invalid `pageSize`, invalid sort |
| No matches | Returns empty list with valid pagination metadata |

## Required deliverables

| Deliverable | Description |
| --- | --- |
| Implementation branch | Branch or commit with all generated changes |
| Tests | Unit/integration tests for the new endpoint |
| Documentation | API documentation |
| Notes | Short summary of implementation decisions and any limitations |
| Validation output | Results from `pnpm test`, `pnpm run lint`, and `pnpm run build` (or similar) |
| Cost/usage output | Tokens, credits, or estimated cost if available |

---
id: enrollment-requests
title: Enrollment requests API
---

The sample workflow uses process-local memory. Requests persist across HTTP calls until the host restarts. There is no authentication; `changedBy` is an operator-supplied audit label.

### Create

`POST /api/enrollment-requests` accepts a JSON object:

```json
{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this training for upcoming secure development work."}
```

The course must exist and be active. Email must have a valid email format. Justification after trimming must contain 20–500 characters. Emails are stored in lowercase and compared case-insensitively. A learner can have only one pending or approved request per course. Rejected and cancelled requests allow a new request. Concurrent creations are serialized to enforce uniqueness.

201 response (IDs are generated UUIDs; timestamps are UTC ISO strings):

```json
{
  "id":"generated-uuid",
  "courseId":"course-001",
  "learnerEmail":"learner@example.org",
  "justification":"I need this training for upcoming secure development work.",
  "status":"pending",
  "createdAt":"2026-10-18T10:00:00.000Z",
  "updatedAt":"2026-10-18T10:00:00.000Z",
  "statusHistory":[{"fromStatus":null,"toStatus":"pending","changedAt":"2026-10-18T10:00:00.000Z","changedBy":"system","reason":null}]
}
```

### Retrieve

`GET /api/enrollment-requests/:id` returns 200 with the complete request object above, including its entire audit history; a missing ID returns 404.

### List

`GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org` returns 200:

```json
{"items":[]}
```

Each matching item has the full request shape shown above. Omit filters to list all requests. Filters combine with AND; `status` supports `pending`, `approved`, `rejected`, `cancelled`; `courseId` is an exact match; `learnerEmail` is a valid email matched case-insensitively. Empty, unknown, repeated, or invalid filters return 400. No matches returns an empty array. Listing has no pagination or guaranteed ordering.

### Change status

`PATCH /api/enrollment-requests/:id/status` accepts:

```json
{"status":"approved","changedBy":"reviewer@example.org"}
```

For rejection:

```json
{"status":"rejected","changedBy":"reviewer@example.org","reason":"Prerequisite course has not been completed."}
```

`changedBy` must be non-empty text. `reason` is optional except for rejection, which requires non-empty text. If supplied, reason must always be non-empty text. Valid transitions:

| From | To |
| --- | --- |
| pending | approved, rejected, cancelled |
| approved | cancelled |
| rejected | none |
| cancelled | none |

Success returns 200 with the updated complete request, unchanged `createdAt`, a new `updatedAt`, and one appended history entry containing `fromStatus`, `toStatus`, `changedAt`, `changedBy`, and `reason` (null when omitted). Invalid transitions, including transitions to the current status, return 409. Failed operations leave data and history unchanged.

### Errors

All resource errors have this shape. Validation collects problems in `details`; business errors have an empty details array.

```json
{"error":{"code":"INVALID_REQUEST","message":"The request could not be completed.","details":[{"field":"justification","message":"justification must be between 20 and 500 characters."}]}}
```

| HTTP | Code | Trigger |
| --- | --- | --- |
| 400 | INVALID_REQUEST | Malformed JSON, non-object body, missing or incorrectly typed fields, invalid email, justification outside 20–500, invalid status, blank changedBy, rejection missing a reason, invalid reason, invalid list filters |
| 404 | COURSE_NOT_FOUND | Creation refers to a missing course |
| 409 | COURSE_NOT_ACTIVE | Creation refers to a draft or retired course |
| 409 | DUPLICATE_ACTIVE_REQUEST | Existing pending or approved request for the same learner/course |
| 404 | ENROLLMENT_REQUEST_NOT_FOUND | Retrieval or update refers to a missing request |
| 409 | INVALID_STATUS_TRANSITION | Any transition outside the table above |

Unknown JSON body properties are ignored; clients cannot set initial status or history. This sample does not integrate with an external enrollment provider.

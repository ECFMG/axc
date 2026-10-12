Feature: Course enrollment requests

  Learners request enrollment on active courses; reviewers approve, reject or cancel those requests.

  # B-AC13 existing suites stay green: healthcheck.feature plus every package unit suite run under `pnpm run verify`.
  # B-AC14 unit coverage lives in packages/axc/{domain,persistence,application-services}/src/*.test.ts.
  # B-AC15 documentation lives in apps/docs/docs/courses.md and apps/docs/docs/enrollment-requests.md.

  Scenario: B-AC2 a valid submission creates a pending request
    When the client posts to "/api/enrollment-requests" with:
      """
      {
        "courseId": "course-001",
        "learnerEmail": "ac2@example.org",
        "justification": "I need this course to prepare for upcoming secure development work."
      }
      """
    Then the response status is 201
    And the response "status" is "pending"
    And the response "courseId" is "course-001"
    And the response "statusHistory" holds 1 entries
    And the response "statusHistory.0.toStatus" is "pending"
    And the response "statusHistory.0.changedBy" is "system"

  Scenario: B-AC3 a request for a course that does not exist is refused
    When the client posts to "/api/enrollment-requests" with:
      """
      {
        "courseId": "course-999",
        "learnerEmail": "ac3@example.org",
        "justification": "I need this course to prepare for upcoming secure development work."
      }
      """
    Then the response status is 404
    And the response "error.code" is "COURSE_NOT_FOUND"

  Scenario: B-AC4 a request for a draft course is refused
    When the client posts to "/api/enrollment-requests" with:
      """
      {
        "courseId": "course-005",
        "learnerEmail": "ac4@example.org",
        "justification": "I need this course to prepare for upcoming secure development work."
      }
      """
    Then the response status is 409
    And the response "error.code" is "COURSE_NOT_ACTIVE"

  Scenario: B-AC4 a request for a retired course is refused
    When the client posts to "/api/enrollment-requests" with:
      """
      {
        "courseId": "course-008",
        "learnerEmail": "ac4b@example.org",
        "justification": "I need this course to prepare for upcoming secure development work."
      }
      """
    Then the response status is 409
    And the response "error.code" is "COURSE_NOT_ACTIVE"

  Scenario: B-AC5 an invalid learner email is refused
    When the client posts to "/api/enrollment-requests" with:
      """
      {
        "courseId": "course-001",
        "learnerEmail": "not-an-email",
        "justification": "I need this course to prepare for upcoming secure development work."
      }
      """
    Then the response status is 400
    And the response "error.code" is "INVALID_REQUEST"
    And the response "error.details.0.field" is "learnerEmail"

  Scenario: B-AC5 a justification shorter than 20 characters is refused
    When the client posts to "/api/enrollment-requests" with:
      """
      {
        "courseId": "course-001",
        "learnerEmail": "ac5@example.org",
        "justification": "too short"
      }
      """
    Then the response status is 400
    And the response "error.code" is "INVALID_REQUEST"
    And the response "error.details.0.field" is "justification"

  Scenario: B-AC6 a learner cannot hold two active requests for one course
    When the client posts to "/api/enrollment-requests" with:
      """
      {
        "courseId": "course-003",
        "learnerEmail": "ac6@example.org",
        "justification": "I need this course to prepare for upcoming secure development work."
      }
      """
    Then the response status is 201
    And the client remembers the response "id" as "duplicateTarget"
    When the client posts to "/api/enrollment-requests" with:
      """
      {
        "courseId": "course-003",
        "learnerEmail": "ac6@example.org",
        "justification": "A second attempt at the very same course for the very same learner."
      }
      """
    Then the response status is 409
    And the response "error.code" is "DUPLICATE_ACTIVE_REQUEST"
    When the client patches "/api/enrollment-requests/{duplicateTarget}/status" with:
      """
      { "status": "approved", "changedBy": "reviewer@example.org" }
      """
    Then the response status is 200
    When the client posts to "/api/enrollment-requests" with:
      """
      {
        "courseId": "course-003",
        "learnerEmail": "ac6@example.org",
        "justification": "A third attempt once the first request has been approved."
      }
      """
    Then the response status is 409
    And the response "error.code" is "DUPLICATE_ACTIVE_REQUEST"

  Scenario: B-AC7 a request can be retrieved by id with its status history
    When the client posts to "/api/enrollment-requests" with:
      """
      {
        "courseId": "course-004",
        "learnerEmail": "ac7@example.org",
        "justification": "I need this course to prepare for upcoming secure development work."
      }
      """
    Then the response status is 201
    And the client remembers the response "id" as "retrievable"
    When the client requests "/api/enrollment-requests/{retrievable}"
    Then the response status is 200
    And the response "learnerEmail" is "ac7@example.org"
    And the response "statusHistory" holds 1 entries

  Scenario: B-AC7 an unknown request id returns 404
    When the client requests "/api/enrollment-requests/does-not-exist"
    Then the response status is 404
    And the response "error.code" is "ENROLLMENT_REQUEST_NOT_FOUND"

  Scenario: B-AC8 requests can be filtered by learner, course and status
    When the client posts to "/api/enrollment-requests" with:
      """
      {
        "courseId": "course-006",
        "learnerEmail": "ac8@example.org",
        "justification": "I need this course to prepare for upcoming secure development work."
      }
      """
    Then the response status is 201
    When the client posts to "/api/enrollment-requests" with:
      """
      {
        "courseId": "course-007",
        "learnerEmail": "ac8@example.org",
        "justification": "I need this course to prepare for upcoming secure development work."
      }
      """
    Then the response status is 201
    When the client requests "/api/enrollment-requests?learnerEmail=ac8@example.org"
    Then the response status is 200
    And the response "items" holds 2 entries
    When the client requests "/api/enrollment-requests?learnerEmail=ac8@example.org&courseId=course-006"
    Then the response status is 200
    And the response "items" holds 1 entries
    And the response "items.0.courseId" is "course-006"
    When the client requests "/api/enrollment-requests?learnerEmail=ac8@example.org&status=pending"
    Then the response status is 200
    And the response "items" holds 2 entries
    And every response item "status" is "pending"
    When the client requests "/api/enrollment-requests?learnerEmail=ac8@example.org&status=rejected"
    Then the response status is 200
    And the response "items" holds 0 entries

  Scenario: B-AC9 a reviewer approves a pending request and later cancels it
    When the client posts to "/api/enrollment-requests" with:
      """
      {
        "courseId": "course-009",
        "learnerEmail": "ac9@example.org",
        "justification": "I need this course to prepare for upcoming secure development work."
      }
      """
    Then the response status is 201
    And the client remembers the response "id" as "approvable"
    When the client patches "/api/enrollment-requests/{approvable}/status" with:
      """
      { "status": "approved", "changedBy": "reviewer@example.org" }
      """
    Then the response status is 200
    And the response "status" is "approved"
    And the response "statusHistory" holds 2 entries
    When the client patches "/api/enrollment-requests/{approvable}/status" with:
      """
      { "status": "cancelled", "changedBy": "reviewer@example.org" }
      """
    Then the response status is 200
    And the response "status" is "cancelled"
    And the response "statusHistory" holds 3 entries
    And the response "statusHistory.2.fromStatus" is "approved"

  Scenario: B-AC9 a learner cancels their own pending request
    When the client posts to "/api/enrollment-requests" with:
      """
      {
        "courseId": "course-012",
        "learnerEmail": "ac9b@example.org",
        "justification": "I need this course to prepare for upcoming secure development work."
      }
      """
    Then the response status is 201
    And the client remembers the response "id" as "cancellable"
    When the client patches "/api/enrollment-requests/{cancellable}/status" with:
      """
      { "status": "cancelled", "changedBy": "ac9b@example.org" }
      """
    Then the response status is 200
    And the response "status" is "cancelled"
    And the response "statusHistory.1.fromStatus" is "pending"

  Scenario: B-AC10 an invalid status transition is refused with 409
    When the client posts to "/api/enrollment-requests" with:
      """
      {
        "courseId": "course-013",
        "learnerEmail": "ac10@example.org",
        "justification": "I need this course to prepare for upcoming secure development work."
      }
      """
    Then the response status is 201
    And the client remembers the response "id" as "rejectable"
    When the client patches "/api/enrollment-requests/{rejectable}/status" with:
      """
      { "status": "rejected", "changedBy": "reviewer@example.org", "reason": "Learner has not completed the prerequisite course." }
      """
    Then the response status is 200
    And the response "status" is "rejected"
    When the client patches "/api/enrollment-requests/{rejectable}/status" with:
      """
      { "status": "approved", "changedBy": "reviewer@example.org" }
      """
    Then the response status is 409
    And the response "error.code" is "INVALID_STATUS_TRANSITION"

  Scenario: B-AC11 rejecting without a reason is refused
    When the client posts to "/api/enrollment-requests" with:
      """
      {
        "courseId": "course-014",
        "learnerEmail": "ac11@example.org",
        "justification": "I need this course to prepare for upcoming secure development work."
      }
      """
    Then the response status is 201
    And the client remembers the response "id" as "unreasoned"
    When the client patches "/api/enrollment-requests/{unreasoned}/status" with:
      """
      { "status": "rejected", "changedBy": "reviewer@example.org" }
      """
    Then the response status is 400
    And the response "error.code" is "INVALID_REQUEST"
    And the response "error.details.0.field" is "reason"

  Scenario: B-AC12 creation and every status change append an audit entry
    When the client posts to "/api/enrollment-requests" with:
      """
      {
        "courseId": "course-002",
        "learnerEmail": "ac12@example.org",
        "justification": "I need this course to prepare for upcoming secure development work."
      }
      """
    Then the response status is 201
    And the client remembers the response "id" as "audited"
    And the response "statusHistory.0.fromStatus" is "null"
    When the client patches "/api/enrollment-requests/{audited}/status" with:
      """
      { "status": "rejected", "changedBy": "reviewer@example.org", "reason": "Learner has not completed the prerequisite course." }
      """
    Then the response status is 200
    When the client requests "/api/enrollment-requests/{audited}"
    Then the response status is 200
    And the response "statusHistory" holds 2 entries
    And the response "statusHistory.1.fromStatus" is "pending"
    And the response "statusHistory.1.toStatus" is "rejected"
    And the response "statusHistory.1.changedBy" is "reviewer@example.org"
    And the response "statusHistory.1.reason" is "Learner has not completed the prerequisite course."

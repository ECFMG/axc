Feature: Enrollment requests

  Scenario: B-AC2 a valid request is created as pending
    When the client sends POST "/api/enrollment-requests" with:
      """
      {"courseId": "course-001", "learnerEmail": "ac2@example.org", "justification": "I need this course to prepare for upcoming secure development work."}
      """
    Then the response status is 201
    And the response "status" is "\"pending\""
    And the response "learnerEmail" is "\"ac2@example.org\""

  Scenario: B-AC3 a request for a missing course returns 404
    When the client sends POST "/api/enrollment-requests" with:
      """
      {"courseId": "course-999", "learnerEmail": "ac3@example.org", "justification": "I need this course to prepare for upcoming secure development work."}
      """
    Then the response status is 404
    And the error code is "COURSE_NOT_FOUND"

  Scenario: B-AC4 a request for a draft or retired course returns 409
    When the client sends POST "/api/enrollment-requests" with:
      """
      {"courseId": "course-006", "learnerEmail": "ac4@example.org", "justification": "I need this course to prepare for upcoming secure development work."}
      """
    Then the response status is 409
    And the error code is "COURSE_NOT_ACTIVE"
    When the client sends POST "/api/enrollment-requests" with:
      """
      {"courseId": "course-005", "learnerEmail": "ac4@example.org", "justification": "I need this course to prepare for upcoming secure development work."}
      """
    Then the response status is 409
    And the error code is "COURSE_NOT_ACTIVE"

  Scenario: B-AC5 invalid email or short justification returns 400
    When the client sends POST "/api/enrollment-requests" with:
      """
      {"courseId": "course-001", "learnerEmail": "not-an-email", "justification": "I need this course to prepare for upcoming secure development work."}
      """
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the response "error.details.0.field" is "\"learnerEmail\""
    When the client sends POST "/api/enrollment-requests" with:
      """
      {"courseId": "course-001", "learnerEmail": "ac5@example.org", "justification": "too short"}
      """
    Then the response status is 400
    And the response "error.details.0.field" is "\"justification\""

  Scenario: B-AC6 duplicate pending or approved requests return 409
    Given "ac6@example.org" has an enrollment request for "course-002"
    When the client sends POST "/api/enrollment-requests" with:
      """
      {"courseId": "course-002", "learnerEmail": "ac6@example.org", "justification": "I need this course to prepare for upcoming secure development work."}
      """
    Then the response status is 409
    And the error code is "DUPLICATE_ACTIVE_REQUEST"
    Given the request is moved to "approved"
    When the client sends POST "/api/enrollment-requests" with:
      """
      {"courseId": "course-002", "learnerEmail": "ac6@example.org", "justification": "I need this course to prepare for upcoming secure development work."}
      """
    Then the response status is 409
    And the error code is "DUPLICATE_ACTIVE_REQUEST"

  Scenario: B-AC7 a request is retrieved by id with its status history
    Given "ac7@example.org" has an enrollment request for "course-003"
    When the client sends GET "/api/enrollment-requests/{id}"
    Then the response status is 200
    And the response "learnerEmail" is "\"ac7@example.org\""
    And the status history is:
      | fromStatus | toStatus |
      | null       | pending  |
    When the client sends GET "/api/enrollment-requests/enroll-999"
    Then the response status is 404
    And the error code is "ENROLLMENT_REQUEST_NOT_FOUND"

  Scenario: B-AC8 requests are filtered by status, courseId and learnerEmail
    Given "ac8@example.org" has an enrollment request for "course-004"
    And the request is moved to "approved"
    When the client sends GET "/api/enrollment-requests?status=approved&courseId=course-004&learnerEmail=ac8@example.org"
    Then the response status is 200
    And the response "0.learnerEmail" is "\"ac8@example.org\""
    And every item has "status" equal to "approved"
    When the client sends GET "/api/enrollment-requests?courseId=course-004"
    Then every item has "courseId" equal to "course-004"
    When the client sends GET "/api/enrollment-requests?learnerEmail=ac8@example.org"
    Then every item has "learnerEmail" equal to "ac8@example.org"
    When the client sends GET "/api/enrollment-requests?status=bogus"
    Then the response status is 400

  Scenario: B-AC9 valid status transitions are applied
    Given "ac9a@example.org" has an enrollment request for "course-007"
    When the client sends PATCH "/api/enrollment-requests/{id}/status" with:
      """
      {"status": "approved", "changedBy": "reviewer@example.org"}
      """
    Then the response status is 200
    And the response "status" is "\"approved\""
    When the client sends PATCH "/api/enrollment-requests/{id}/status" with:
      """
      {"status": "cancelled", "changedBy": "reviewer@example.org"}
      """
    Then the response "status" is "\"cancelled\""
    Given "ac9b@example.org" has an enrollment request for "course-007"
    When the client sends PATCH "/api/enrollment-requests/{id}/status" with:
      """
      {"status": "cancelled", "changedBy": "ac9b@example.org"}
      """
    Then the response "status" is "\"cancelled\""
    Given "ac9c@example.org" has an enrollment request for "course-007"
    When the client sends PATCH "/api/enrollment-requests/{id}/status" with:
      """
      {"status": "rejected", "changedBy": "reviewer@example.org", "reason": "Prerequisite not completed."}
      """
    Then the response "status" is "\"rejected\""

  Scenario: B-AC10 invalid transitions return 409
    Given "ac10@example.org" has an enrollment request for "course-008"
    And the request is moved to "cancelled"
    When the client sends PATCH "/api/enrollment-requests/{id}/status" with:
      """
      {"status": "approved", "changedBy": "reviewer@example.org"}
      """
    Then the response status is 409
    And the error code is "INVALID_STATUS_TRANSITION"
    When the client sends PATCH "/api/enrollment-requests/{id}/status" with:
      """
      {"status": "archived", "changedBy": "reviewer@example.org"}
      """
    Then the response status is 400

  Scenario: B-AC11 rejection requires a reason
    Given "ac11@example.org" has an enrollment request for "course-009"
    When the client sends PATCH "/api/enrollment-requests/{id}/status" with:
      """
      {"status": "rejected", "changedBy": "reviewer@example.org", "reason": " "}
      """
    Then the response status is 400
    And the response "error.details.0.field" is "\"reason\""

  Scenario: B-AC12 creation and every status change add a status history entry
    Given "ac12@example.org" has an enrollment request for "course-012"
    And the request is moved to "approved"
    And the request is moved to "cancelled"
    When the client sends GET "/api/enrollment-requests/{id}"
    Then the status history is:
      | fromStatus | toStatus  |
      | null       | pending   |
      | pending    | approved  |
      | approved   | cancelled |
    And the response "statusHistory.1.changedBy" is "\"reviewer@example.org\""

  Scenario: B-AC13 existing healthcheck still passes
    When the client sends GET "/health"
    Then the response status is 200
    And the response "status" is "\"ok\""

  Scenario: B-AC14 error handling covers non-JSON bodies and unknown ids
    When the client sends PATCH "/api/enrollment-requests/enroll-999/status" with:
      """
      {"status": "approved", "changedBy": "reviewer@example.org"}
      """
    Then the response status is 404
    And the error code is "ENROLLMENT_REQUEST_NOT_FOUND"
    When the client sends POST "/api/enrollment-requests" with:
      """
      {"learnerEmail": "ac14@example.org"}
      """
    Then the response status is 400
    And the error code is "INVALID_REQUEST"

  Scenario: B-AC15 errors use the documented envelope with code, message and details
    When the client sends POST "/api/enrollment-requests" with:
      """
      {"courseId": "course-001", "learnerEmail": "ac15@example.org", "justification": "short"}
      """
    Then the response status is 400
    And the response "error.message" is "\"The request could not be completed.\""
    And the response "error.details.0.message" is "\"justification must be between 20 and 500 characters.\""

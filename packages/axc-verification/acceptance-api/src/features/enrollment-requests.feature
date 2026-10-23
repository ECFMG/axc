Feature: Enrollment request workflow

  Scenario: POST /api/enrollment-requests creates a pending request
    When the client creates an enrollment request for course "course-001" as "create-valid@example.org" with a valid justification
    Then the response status is 201
    And the enrollment request status is "pending"
    And the enrollment request has a creation history entry

  Scenario: Creating a request for a missing course returns 404
    When the client creates an enrollment request for course "course-missing" as "missing-course@example.org" with a valid justification
    Then the response status is 404
    And the error code is "COURSE_NOT_FOUND"

  Scenario: Creating a request for a draft course returns 409
    When the client creates an enrollment request for course "course-003" as "draft-course@example.org" with a valid justification
    Then the response status is 409
    And the error code is "COURSE_NOT_ACTIVE"

  Scenario: Creating a request for a retired course returns 409
    When the client creates an enrollment request for course "course-004" as "retired-course@example.org" with a valid justification
    Then the response status is 409
    And the error code is "COURSE_NOT_ACTIVE"

  Scenario: Invalid email returns 400
    When the client creates an enrollment request for course "course-001" as "not-an-email" with a valid justification
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details include fields "learnerEmail"

  Scenario: Short justification returns 400
    When the client creates an enrollment request for course "course-001" as "short-justification@example.org" with justification "too short"
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details include fields "justification"

  Scenario: Duplicate pending request returns 409
    When the client creates an enrollment request for course "course-001" as "dup-pending@example.org" with a valid justification
    Then the response status is 201
    When the client creates an enrollment request for course "course-001" as "dup-pending@example.org" with a valid justification
    Then the response status is 409
    And the error code is "DUPLICATE_ACTIVE_REQUEST"

  Scenario: Duplicate approved request returns 409
    When the client creates an enrollment request for course "course-001" as "dup-approved@example.org" with a valid justification
    Then the response status is 201
    When the client patches the last enrollment request status to "approved" as "reviewer@example.org"
    Then the response status is 200
    When the client creates an enrollment request for course "course-001" as "dup-approved@example.org" with a valid justification
    Then the response status is 409
    And the error code is "DUPLICATE_ACTIVE_REQUEST"

  Scenario: GET /api/enrollment-requests/:id returns the request with status history
    When the client creates an enrollment request for course "course-001" as "get-by-id@example.org" with a valid justification
    Then the response status is 201
    When the client retrieves the last enrollment request by id
    Then the response status is 200
    And the enrollment request status is "pending"
    And the enrollment request has a creation history entry

  Scenario: GET /api/enrollment-requests/:id returns 404 when missing
    When the client requests "/api/enrollment-requests/enroll-missing"
    Then the response status is 404
    And the error code is "ENROLLMENT_REQUEST_NOT_FOUND"

  Scenario: GET /api/enrollment-requests filters by status, courseId, and learnerEmail
    When the client creates an enrollment request for course "course-001" as "filter-one@example.org" with a valid justification
    Then the response status is 201
    When the client creates an enrollment request for course "course-002" as "filter-two@example.org" with a valid justification
    Then the response status is 201
    When the client requests "/api/enrollment-requests?status=pending&courseId=course-002&learnerEmail=filter-two@example.org"
    Then the response status is 200
    And every enrollment request has status "pending"
    And every enrollment request has course id "course-002"
    And every enrollment request has learner email "filter-two@example.org"

  Scenario: PATCH pending to approved
    When the client creates an enrollment request for course "course-001" as "to-approved@example.org" with a valid justification
    Then the response status is 201
    When the client patches the last enrollment request status to "approved" as "reviewer@example.org"
    Then the response status is 200
    And the enrollment request status is "approved"
    And the enrollment request history includes a change from "pending" to "approved"

  Scenario: PATCH pending to rejected with reason
    When the client creates an enrollment request for course "course-001" as "to-rejected@example.org" with a valid justification
    Then the response status is 201
    When the client patches the last enrollment request status to "rejected" as "reviewer@example.org" with reason "Learner has not completed the prerequisite course."
    Then the response status is 200
    And the enrollment request status is "rejected"
    And the enrollment request history includes a change from "pending" to "rejected"

  Scenario: PATCH pending to cancelled
    When the client creates an enrollment request for course "course-001" as "to-cancelled@example.org" with a valid justification
    Then the response status is 201
    When the client patches the last enrollment request status to "cancelled" as "reviewer@example.org"
    Then the response status is 200
    And the enrollment request status is "cancelled"

  Scenario: PATCH approved to cancelled
    When the client creates an enrollment request for course "course-001" as "approved-cancel@example.org" with a valid justification
    Then the response status is 201
    When the client patches the last enrollment request status to "approved" as "reviewer@example.org"
    Then the response status is 200
    When the client patches the last enrollment request status to "cancelled" as "reviewer@example.org"
    Then the response status is 200
    And the enrollment request status is "cancelled"
    And the enrollment request history includes a change from "approved" to "cancelled"

  Scenario: Invalid status transition returns 409
    When the client creates an enrollment request for course "course-001" as "invalid-transition@example.org" with a valid justification
    Then the response status is 201
    When the client patches the last enrollment request status to "rejected" as "reviewer@example.org" with reason "Learner has not completed the prerequisite course."
    Then the response status is 200
    When the client patches the last enrollment request status to "approved" as "reviewer@example.org"
    Then the response status is 409
    And the error code is "INVALID_STATUS_TRANSITION"

  Scenario: Rejection without reason returns 400
    When the client creates an enrollment request for course "course-001" as "reject-no-reason@example.org" with a valid justification
    Then the response status is 201
    When the client patches the last enrollment request status to "rejected" as "reviewer@example.org"
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details include fields "reason"

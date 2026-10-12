Feature: Enrollment requests

  Learners submit enrollment requests for active courses and reviewers approve,
  reject, or cancel them. Every change is captured in the request's audit trail.

  Scenario: A learner submits a request and a reviewer approves it
    When learner "approver.journey@example.org" requests enrollment in course "course-001"
    Then the API responds with status 201
    And the enrollment request status is "pending"
    And the enrollment request audit trail has 1 entry
    When the client retrieves the recorded enrollment request
    Then the API responds with status 200
    And the enrollment request status is "pending"
    When the reviewer sets the recorded enrollment request status to "approved"
    Then the API responds with status 200
    And the enrollment request status is "approved"
    And the enrollment request audit trail has 2 entries
    When the reviewer sets the recorded enrollment request status to "cancelled"
    Then the API responds with status 200
    And the enrollment request status is "cancelled"
    And the enrollment request audit trail has 3 entries

  Scenario: A reviewer rejects a request with a reason
    When learner "rejected.journey@example.org" requests enrollment in course "course-001"
    Then the API responds with status 201
    When the reviewer sets the recorded enrollment request status to "rejected" with reason "Learner has not completed the prerequisite course."
    Then the API responds with status 200
    And the enrollment request status is "rejected"
    And the enrollment request audit trail has 2 entries

  Scenario: Rejecting without a reason is refused
    When learner "no.reason@example.org" requests enrollment in course "course-001"
    Then the API responds with status 201
    When the reviewer sets the recorded enrollment request status to "rejected"
    Then the API responds with status 400
    And the API responds with error code "INVALID_REQUEST"

  Scenario: A learner cannot hold two active requests for one course
    When learner "duplicate.journey@example.org" requests enrollment in course "course-001"
    Then the API responds with status 201
    When learner "duplicate.journey@example.org" requests enrollment in course "course-001"
    Then the API responds with status 409
    And the API responds with error code "DUPLICATE_ACTIVE_REQUEST"

  Scenario: An invalid status transition is refused
    When learner "transition.journey@example.org" requests enrollment in course "course-001"
    Then the API responds with status 201
    When the reviewer sets the recorded enrollment request status to "cancelled"
    Then the API responds with status 200
    When the reviewer sets the recorded enrollment request status to "approved"
    Then the API responds with status 409
    And the API responds with error code "INVALID_STATUS_TRANSITION"

  Scenario: A request for a course that does not exist is refused
    When learner "missing.course@example.org" requests enrollment in course "course-404"
    Then the API responds with status 404
    And the API responds with error code "COURSE_NOT_FOUND"

  Scenario: A request for a course that is not active is refused
    When learner "draft.course@example.org" requests enrollment in course "course-005"
    Then the API responds with status 409
    And the API responds with error code "COURSE_NOT_ACTIVE"

  Scenario: An invalid learner email is refused
    When learner "not-an-email" requests enrollment in course "course-001"
    Then the API responds with status 400
    And the API responds with error code "INVALID_REQUEST"

  Scenario: A justification that is too short is refused
    When learner "short.justification@example.org" requests enrollment in course "course-001" with justification "Too short."
    Then the API responds with status 400
    And the API responds with error code "INVALID_REQUEST"

  Scenario: Requests can be filtered by learner, course, and status
    When learner "filtered.journey@example.org" requests enrollment in course "course-003"
    Then the API responds with status 201
    When the client lists enrollment requests with "learnerEmail=filtered.journey@example.org"
    Then the API responds with status 200
    And the enrollment request list contains 1 request
    When the client lists enrollment requests with "learnerEmail=filtered.journey@example.org&courseId=course-003&status=pending"
    Then the API responds with status 200
    And the enrollment request list contains 1 request
    When the client lists enrollment requests with "learnerEmail=filtered.journey@example.org&status=approved"
    Then the API responds with status 200
    And the enrollment request list contains 0 requests
    When the client lists enrollment requests with "status=archived"
    Then the API responds with status 400
    And the API responds with error code "INVALID_QUERY_PARAMETER"

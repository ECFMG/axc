Feature: Enrollment requests

  Scenario: B-AC2 a valid enrollment request starts as pending
    When the client creates an enrollment request for "course-001" with a valid justification
    Then the response status is 201
    And the enrollment request is pending for "course-001"
    And the enrollment request history starts with a system pending entry

  Scenario: B-AC3 a missing course returns 404
    When the client creates an enrollment request for "course-missing" with a valid justification
    Then the response status is 404
    And the error code is "COURSE_NOT_FOUND"

  Scenario: B-AC4 a draft or retired course returns 409
    When the client creates an enrollment request for "course-010" with a valid justification
    Then the response status is 409
    And the error code is "COURSE_NOT_ACTIVE"
    When the client creates an enrollment request for "course-004" with a valid justification
    Then the response status is 409
    And the error code is "COURSE_NOT_ACTIVE"

  Scenario: B-AC5 invalid email or a justification outside the length limit returns 400
    When the client creates an enrollment request for "course-001" with email "not-an-email" and justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details include field "learnerEmail"
    When the client creates an enrollment request for "course-001" with email "learner-short@example.org" and justification "too short"
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details include field "justification"
    When the client creates an enrollment request for "course-001" with a justification of 501 characters
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details include field "justification"

  Scenario: B-AC6 duplicate pending or approved requests return 409
    When the client creates an enrollment request for "course-001" with a valid justification
    Then the response status is 201
    When the client creates another enrollment request for the same learner and "course-001"
    Then the response status is 409
    And the error code is "DUPLICATE_ACTIVE_REQUEST"
    When the client approves the current enrollment request
    And the client creates another enrollment request for the same learner and "course-001"
    Then the response status is 409
    And the error code is "DUPLICATE_ACTIVE_REQUEST"

  Scenario: B-AC7 get by id returns the request and its status history
    When the client creates an enrollment request for "course-002" with a valid justification
    And the client reads the current enrollment request
    Then the response status is 200
    And the enrollment request includes the created justification and status history

  Scenario: B-AC8 list filters by status, course, and learner
    When the client creates an enrollment request for "course-005" with a valid justification
    And the client lists enrollment requests with status "pending"
    Then the response status is 200
    And every listed enrollment request has status "pending"
    And the listed enrollment requests include the current request
    When the client lists enrollment requests for course "course-005"
    Then the response status is 200
    And every listed enrollment request has course "course-005"
    And the listed enrollment requests include the current request
    When the client lists enrollment requests for the created learner
    Then the response status is 200
    And every listed enrollment request belongs to the created learner
    And the listed enrollment requests include the current request
    When the client lists enrollment requests filtered by the created request
    Then the response status is 200
    And every listed enrollment request has status "pending"
    And every listed enrollment request has course "course-005"
    And every listed enrollment request belongs to the created learner
    And the listed enrollment requests include the current request

  Scenario: B-AC9 valid status transitions are applied
    When the client creates an enrollment request for "course-006" with a valid justification
    And the client sets the current enrollment request status to "approved"
    Then the response status is 200
    And the enrollment request status is "approved"
    When the client creates an enrollment request for "course-007" with a valid justification
    And the client rejects the current enrollment request with reason "Learner has not completed the prerequisite course."
    Then the response status is 200
    And the enrollment request status is "rejected"
    When the client creates an enrollment request for "course-008" with a valid justification
    And the client sets the current enrollment request status to "cancelled"
    Then the response status is 200
    And the enrollment request status is "cancelled"
    When the client creates an enrollment request for "course-011" with a valid justification
    And the client sets the current enrollment request status to "approved"
    And the client sets the current enrollment request status to "cancelled"
    Then the response status is 200
    And the enrollment request status is "cancelled"
    And the enrollment request history has 3 entries

  Scenario: B-AC10 an invalid status transition returns 409
    When the client creates an enrollment request for "course-001" with a valid justification
    And the client rejects the current enrollment request with reason "Learner has not completed the prerequisite course."
    And the client sets the current enrollment request status to "approved"
    Then the response status is 409
    And the error code is "INVALID_STATUS_TRANSITION"

  Scenario: B-AC11 rejection requires a reason
    When the client creates an enrollment request for "course-002" with a valid justification
    And the client rejects the current enrollment request without a reason
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details include field "reason"

  Scenario: B-AC12 creation and status changes append status history
    When the client creates an enrollment request for "course-005" with a valid justification
    And the client sets the current enrollment request status to "approved"
    And the client reads the current enrollment request
    Then the response status is 200
    And the enrollment request history has 2 entries
    And the last history entry changes "pending" to "approved"

  Scenario: a missing enrollment request returns 404
    When the client reads enrollment request "enroll-missing"
    Then the response status is 404
    And the error code is "ENROLLMENT_REQUEST_NOT_FOUND"
    When the client sets enrollment request "enroll-missing" status to "approved"
    Then the response status is 404
    And the error code is "ENROLLMENT_REQUEST_NOT_FOUND"

  Scenario: an invalid status value returns 400
    When the client creates an enrollment request for "course-007" with a valid justification
    And the client sets the current enrollment request status to "archived"
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details include field "status"

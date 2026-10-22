Feature: Enrollment requests

  Scenario: A valid request starts pending
    When the client creates an enrollment request for "ada@example.org" on course "course-001"
    Then the enrollment response status is 200
    And the enrollment status is "pending"
    And the enrollment history has 1 entries
    And the first history entry was recorded by "system"

  Scenario: A missing course is not found
    When the client creates an enrollment request for "grace@example.org" on course "course-404"
    Then the enrollment response status is 404
    And the error code is "COURSE_NOT_FOUND"

  Scenario: A draft course cannot be requested
    When the client creates an enrollment request for "lin@example.org" on course "course-004"
    Then the enrollment response status is 409
    And the error code is "COURSE_NOT_ACTIVE"

  Scenario: A retired course cannot be requested
    When the client creates an enrollment request for "noor@example.org" on course "course-005"
    Then the enrollment response status is 409
    And the error code is "COURSE_NOT_ACTIVE"

  Scenario: Invalid email and short justification are rejected
    When the client submits an enrollment request with email "not-an-email" and justification "Too short." on course "course-001"
    Then the enrollment response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details include "learnerEmail"
    And the error details include "justification"

  Scenario: A learner cannot open a second pending request for the same course
    When the client creates an enrollment request for "sam@example.org" on course "course-001"
    Then the enrollment response status is 200
    When the client creates an enrollment request for "sam@example.org" on course "course-001"
    Then the enrollment response status is 409
    And the error code is "DUPLICATE_ACTIVE_REQUEST"

  Scenario: A request can be read by id and listed by filter
    When the client creates an enrollment request for "riley@example.org" on course "course-002"
    Then the enrollment response status is 200
    When the client reads the enrollment request
    Then the enrollment response status is 200
    And the enrollment status is "pending"
    When the client lists enrollment requests at "/api/enrollment-requests?status=pending&courseId=course-002&learnerEmail=riley@example.org"
    Then the enrollment response status is 200
    And the enrollment list contains the current request

  Scenario: Approval is recorded and a later rejection conflicts
    When the client creates an enrollment request for "quinn@example.org" on course "course-006"
    Then the enrollment response status is 200
    When the client sets the enrollment request status to "approved" as "reviewer@example.org"
    Then the enrollment response status is 200
    And the enrollment status is "approved"
    And the enrollment history has 2 entries
    When the client rejects the enrollment request as "reviewer@example.org" because "Too late."
    Then the enrollment response status is 409
    And the error code is "INVALID_STATUS_TRANSITION"

  Scenario: Rejection requires a reason
    When the client creates an enrollment request for "tara@example.org" on course "course-008"
    Then the enrollment response status is 200
    When the client rejects the enrollment request as "reviewer@example.org" without a reason
    Then the enrollment response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details include "reason"
    When the client reads the enrollment request
    Then the enrollment status is "pending"
    And the enrollment history has 1 entries

  Scenario: An unknown request is not found
    When the client reads enrollment request "enroll-missing"
    Then the enrollment response status is 404
    And the error code is "ENROLLMENT_REQUEST_NOT_FOUND"

  Scenario: Malformed JSON is rejected
    When the client posts malformed enrollment JSON
    Then the enrollment response status is 400
    And the error code is "INVALID_REQUEST"

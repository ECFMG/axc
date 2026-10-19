Feature: Enrollment requests

  Scenario: A valid request starts pending and records creation
    When the client creates an enrollment request for course "course-001" as "create-pending@example.org" because "I need this course to prepare for upcoming secure development work."
    Then the enrollment request responds with status 201
    And the enrollment request status is "pending"
    And the enrollment request course is "course-001"
    And the enrollment request learner is "create-pending@example.org"
    And the enrollment request history has 1 entries
    And enrollment history entry 1 goes from "" to "pending" by "system"

  Scenario: Creating a request for a missing course returns 404
    When the client creates an enrollment request for course "course-404" as "missing-course@example.org" because "I need this course to prepare for upcoming secure development work."
    Then the enrollment request responds with status 404
    And the enrollment request error code is "COURSE_NOT_FOUND"

  Scenario: Creating a request for a draft course returns 409
    When the client creates an enrollment request for course "course-003" as "draft-course@example.org" because "I need this course to prepare for upcoming secure development work."
    Then the enrollment request responds with status 409
    And the enrollment request error code is "COURSE_NOT_ACTIVE"

  Scenario: Creating a request for a retired course returns 409
    When the client creates an enrollment request for course "course-004" as "retired-course@example.org" because "I need this course to prepare for upcoming secure development work."
    Then the enrollment request responds with status 409
    And the enrollment request error code is "COURSE_NOT_ACTIVE"

  Scenario: Invalid email and short justification return 400
    When the client submits this enrollment request:
      """
      {"courseId":"course-001","learnerEmail":"not-an-email","justification":"too short"}
      """
    Then the enrollment request responds with status 400
    And the enrollment request error code is "INVALID_REQUEST"
    And the enrollment request error message is "The request could not be completed."
    And the enrollment request error details include field "learnerEmail"
    And the enrollment request error details include field "justification" and message "justification must be between 20 and 500 characters."

  Scenario: Malformed JSON returns 400
    When the client submits malformed enrollment request JSON
    Then the enrollment request responds with status 400
    And the enrollment request error code is "INVALID_REQUEST"
    And the enrollment request error details include field "body"

  Scenario: A learner cannot open a second pending request for the same course
    When the client creates an enrollment request for course "course-009" as "duplicate-pending@example.org" because "I need this course to prepare for upcoming secure development work."
    Then the enrollment request responds with status 201
    When the client creates an enrollment request for course "course-009" as "duplicate-pending@example.org" because "I need this course to prepare for upcoming secure development work."
    Then the enrollment request responds with status 409
    And the enrollment request error code is "DUPLICATE_ACTIVE_REQUEST"

  Scenario: A learner cannot open a second request while an approved one is active
    When the client creates an enrollment request for course "course-010" as "duplicate-approved@example.org" because "I need this course to prepare for upcoming secure development work."
    Then the enrollment request responds with status 201
    When the client sets the created enrollment request status to "approved" by "reviewer@example.org"
    Then the enrollment request responds with status 200
    When the client creates an enrollment request for course "course-010" as "duplicate-approved@example.org" because "I need this course to prepare for upcoming secure development work."
    Then the enrollment request responds with status 409
    And the enrollment request error code is "DUPLICATE_ACTIVE_REQUEST"

  Scenario: Retrieve by id returns the request and its history
    When the client creates an enrollment request for course "course-014" as "retrieve-request@example.org" because "I need this course to prepare for upcoming secure development work."
    Then the enrollment request responds with status 201
    When the client retrieves the created enrollment request
    Then the enrollment request responds with status 200
    And the enrollment request status is "pending"
    And the enrollment request history has 1 entries
    And enrollment history entry 1 goes from "" to "pending" by "system"

  Scenario: An unknown enrollment request returns 404
    When the client requests enrollment request "enroll-missing"
    Then the enrollment request responds with status 404
    And the enrollment request error code is "ENROLLMENT_REQUEST_NOT_FOUND"

  Scenario: List filters by status, course, and learner
    When the client creates an enrollment request for course "course-005" as "filter-one@example.org" because "I need this course to prepare for upcoming secure development work."
    Then the enrollment request responds with status 201
    When the client creates an enrollment request for course "course-005" as "filter-two@example.org" because "I need this course to prepare for upcoming secure development work."
    Then the enrollment request responds with status 201
    When the client sets the created enrollment request status to "approved" by "reviewer@example.org"
    Then the enrollment request responds with status 200
    When the client creates an enrollment request for course "course-002" as "filter-one@example.org" because "I need this course to prepare for upcoming secure development work."
    Then the enrollment request responds with status 201
    When the client lists enrollment requests with query "status=pending&courseId=course-005&learnerEmail=FILTER-ONE@example.org"
    Then the enrollment request responds with status 200
    And the enrollment request list contains 1 requests
    And every listed enrollment request has status "pending"
    And every listed enrollment request has course "course-005"
    And every listed enrollment request has learner "filter-one@example.org"
    When the client lists enrollment requests with query "courseId=course-005"
    Then the enrollment request responds with status 200
    And the enrollment request list contains 2 requests
    When the client lists enrollment requests with query "learnerEmail=nobody@example.org"
    Then the enrollment request responds with status 200
    And the enrollment request list contains 0 requests

  Scenario: Invalid list filters return 400
    When the client lists enrollment requests with query "status=archived"
    Then the enrollment request responds with status 400
    And the enrollment request error code is "INVALID_REQUEST"
    And the enrollment request error details include field "status"

  Scenario: Pending can be approved
    When the client creates an enrollment request for course "course-012" as "approve-request@example.org" because "I need this course to prepare for upcoming secure development work."
    Then the enrollment request responds with status 201
    When the client sets the created enrollment request status to "approved" by "reviewer@example.org"
    Then the enrollment request responds with status 200
    And the enrollment request status is "approved"
    And the enrollment request history has 2 entries
    And enrollment history entry 2 goes from "pending" to "approved" by "reviewer@example.org"

  Scenario: Pending can be rejected with a reason
    When the client creates an enrollment request for course "course-001" as "reject-request@example.org" because "I need this course to prepare for upcoming secure development work."
    Then the enrollment request responds with status 201
    When the client sets the created enrollment request status to "rejected" by "reviewer@example.org" because "Learner has not completed the prerequisite course."
    Then the enrollment request responds with status 200
    And the enrollment request status is "rejected"
    And the enrollment request history has 2 entries
    And enrollment history entry 2 goes from "pending" to "rejected" by "reviewer@example.org" because "Learner has not completed the prerequisite course."

  Scenario: Pending can be cancelled
    When the client creates an enrollment request for course "course-002" as "cancel-pending@example.org" because "I need this course to prepare for upcoming secure development work."
    Then the enrollment request responds with status 201
    When the client sets the created enrollment request status to "cancelled" by "reviewer@example.org"
    Then the enrollment request responds with status 200
    And the enrollment request status is "cancelled"
    And enrollment history entry 2 goes from "pending" to "cancelled" by "reviewer@example.org"

  Scenario: Approved can be cancelled
    When the client creates an enrollment request for course "course-007" as "cancel-approved@example.org" because "I need this course to prepare for upcoming secure development work."
    Then the enrollment request responds with status 201
    When the client sets the created enrollment request status to "approved" by "reviewer@example.org"
    Then the enrollment request responds with status 200
    When the client sets the created enrollment request status to "cancelled" by "operator@example.org"
    Then the enrollment request responds with status 200
    And the enrollment request status is "cancelled"
    And the enrollment request history has 3 entries
    And enrollment history entry 3 goes from "approved" to "cancelled" by "operator@example.org"

  Scenario: An invalid transition returns 409
    When the client creates an enrollment request for course "course-001" as "invalid-transition@example.org" because "I need this course to prepare for upcoming secure development work."
    Then the enrollment request responds with status 201
    When the client sets the created enrollment request status to "pending" by "reviewer@example.org"
    Then the enrollment request responds with status 409
    And the enrollment request error code is "INVALID_STATUS_TRANSITION"

  Scenario: Rejecting without a reason returns 400
    When the client creates an enrollment request for course "course-014" as "reject-without-reason@example.org" because "I need this course to prepare for upcoming secure development work."
    Then the enrollment request responds with status 201
    When the client sets the created enrollment request status to "rejected" by "reviewer@example.org"
    Then the enrollment request responds with status 400
    And the enrollment request error code is "INVALID_REQUEST"
    And the enrollment request error details include field "reason"
    When the client retrieves the created enrollment request
    Then the enrollment request responds with status 200
    And the enrollment request status is "pending"
    And the enrollment request history has 1 entries

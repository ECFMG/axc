Feature: Enrollment Request

  Scenario: Course search from Task Set A still filters the catalog
    When the client requests courses with query "?q=security&modality=online&status=active"
    Then the courses response status is 200
    And the courses total is 2 items and 1 pages

  Scenario: A valid request starts pending and records the initial status
    When the client creates an enrollment request for course "000000000000000000000002" as "Create-Valid@Example.org"
    Then the enrollment response status is 200
    And the enrollment request status is "pending"
    And the enrollment learner email is "create-valid@example.org"
    And the enrollment course is "000000000000000000000002"
    And the enrollment status history has 1 entries
    And the enrollment history entry 1 goes from "null" to "pending" by "system"
    And the enrollment history entry 1 has no reason
    And the created enrollment request id is remembered
    When the client reads the stored enrollment request
    Then the enrollment response status is 200
    And the enrollment request status is "pending"
    And the enrollment status history has 1 entries

  Scenario: The seeded enrollment request can be read by id
    When the client reads enrollment request "000000000000000000000101"
    Then the enrollment response status is 200
    And the enrollment learner email is "seed-learner@example.org"
    And the enrollment request status is "pending"
    And the enrollment status history has 1 entries
    And the enrollment history entry 1 goes from "null" to "pending" by "system"

  Scenario: A missing course is rejected
    When the client creates an enrollment request for course "course-001" as "missing-course@example.org"
    Then the enrollment response status is 404
    And the enrollment error code is "COURSE_NOT_FOUND"
    And the enrollment error details include field "courseId"

  Scenario: A draft course is rejected
    When the client creates an enrollment request for course "000000000000000000000009" as "draft-course@example.org"
    Then the enrollment response status is 409
    And the enrollment error code is "COURSE_NOT_ACTIVE"

  Scenario: A retired course is rejected
    When the client creates an enrollment request for course "000000000000000000000006" as "retired-course@example.org"
    Then the enrollment response status is 409
    And the enrollment error code is "COURSE_NOT_ACTIVE"

  Scenario: An invalid email is rejected
    When the client creates an enrollment request with email "not-an-email" and justification "I need this course to prepare for upcoming secure development work." for course "000000000000000000000001"
    Then the enrollment response status is 400
    And the enrollment error code is "INVALID_REQUEST"
    And the enrollment error details include field "learnerEmail"
    And the enrollment error message for "learnerEmail" is "learnerEmail must be a valid email address."

  Scenario: A short justification is rejected
    When the client creates an enrollment request with email "short-justification@example.org" and justification "Too short." for course "000000000000000000000001"
    Then the enrollment response status is 400
    And the enrollment error code is "INVALID_REQUEST"
    And the enrollment error details include field "justification"
    And the enrollment error message for "justification" is "justification must be between 20 and 500 characters."

  Scenario: A long justification is rejected
    When the client creates an enrollment request with justification length 501 for course "000000000000000000000001" as "long-justification@example.org"
    Then the enrollment response status is 400
    And the enrollment error code is "INVALID_REQUEST"
    And the enrollment error details include field "justification"

  Scenario: A second pending request for the same learner and course is rejected
    When the client creates an enrollment request for course "000000000000000000000003" as "duplicate-pending@example.org"
    Then the enrollment response status is 200
    When the client creates an enrollment request for course "000000000000000000000003" as "duplicate-pending@example.org"
    Then the enrollment response status is 409
    And the enrollment error code is "DUPLICATE_ACTIVE_REQUEST"

  Scenario: A second request is rejected while an approved request is active
    When the client creates an enrollment request for course "000000000000000000000007" as "duplicate-approved@example.org"
    Then the enrollment response status is 200
    And the created enrollment request id is remembered
    When the client sets the stored enrollment request status to "approved" by "reviewer@example.org"
    Then the enrollment response status is 200
    When the client creates an enrollment request for course "000000000000000000000007" as "duplicate-approved@example.org"
    Then the enrollment response status is 409
    And the enrollment error code is "DUPLICATE_ACTIVE_REQUEST"

  Scenario: A learner can request again after cancellation
    When the client creates an enrollment request for course "00000000000000000000000b" as "cancel-again@example.org"
    Then the enrollment response status is 200
    And the created enrollment request id is remembered
    When the client sets the stored enrollment request status to "cancelled" by "learner@example.org"
    Then the enrollment response status is 200
    When the client creates an enrollment request for course "00000000000000000000000b" as "cancel-again@example.org"
    Then the enrollment response status is 200
    And the enrollment request status is "pending"

  Scenario: Enrollment requests can be filtered by status, course, and learner
    When the client creates an enrollment request for course "000000000000000000000008" as "Filter-Learner@Example.org"
    Then the enrollment response status is 200
    When the client lists enrollment requests with query "?status=pending&courseId=000000000000000000000008&learnerEmail=Filter-Learner@Example.org"
    Then the enrollment response status is 200
    And the enrollment list count is 1
    And every listed enrollment status is "pending"
    And every listed enrollment course is "000000000000000000000008"
    And every listed enrollment email is "filter-learner@example.org"

  Scenario: An unknown enrollment request id is rejected
    When the client reads enrollment request "000000000000000000000199"
    Then the enrollment response status is 404
    And the enrollment error code is "ENROLLMENT_REQUEST_NOT_FOUND"

  Scenario: An invalid list status is rejected
    When the client lists enrollment requests with query "?status=archived"
    Then the enrollment response status is 400
    And the enrollment error code is "INVALID_REQUEST"
    And the enrollment error details include field "status"

  Scenario: Pending can be approved and the audit trail grows
    When the client creates an enrollment request for course "000000000000000000000002" as "approve-learner@example.org"
    Then the enrollment response status is 200
    And the created enrollment request id is remembered
    When the client sets the stored enrollment request status to "approved" by "reviewer@example.org"
    Then the enrollment response status is 200
    And the enrollment request status is "approved"
    And the enrollment status history has 2 entries
    And the enrollment history entry 1 goes from "null" to "pending" by "system"
    And the enrollment history entry 2 goes from "pending" to "approved" by "reviewer@example.org"

  Scenario: Pending can be rejected when a reason is provided
    When the client creates an enrollment request for course "000000000000000000000003" as "reject-learner@example.org"
    Then the enrollment response status is 200
    And the created enrollment request id is remembered
    When the client sets the stored enrollment request status to "rejected" by "reviewer@example.org" because "Learner has not completed the prerequisite course."
    Then the enrollment response status is 200
    And the enrollment request status is "rejected"
    And the enrollment status history has 2 entries
    And the enrollment history entry 2 goes from "pending" to "rejected" by "reviewer@example.org"
    And the enrollment history entry 2 reason is "Learner has not completed the prerequisite course."

  Scenario: Pending can be cancelled
    When the client creates an enrollment request for course "000000000000000000000001" as "cancel-learner@example.org"
    Then the enrollment response status is 200
    And the created enrollment request id is remembered
    When the client sets the stored enrollment request status to "cancelled" by "learner@example.org"
    Then the enrollment response status is 200
    And the enrollment request status is "cancelled"
    And the enrollment status history has 2 entries
    And the enrollment history entry 2 goes from "pending" to "cancelled" by "learner@example.org"

  Scenario: Approved can be cancelled
    When the client creates an enrollment request for course "000000000000000000000008" as "approved-cancel@example.org"
    Then the enrollment response status is 200
    And the created enrollment request id is remembered
    When the client sets the stored enrollment request status to "approved" by "reviewer@example.org"
    Then the enrollment response status is 200
    When the client sets the stored enrollment request status to "cancelled" by "reviewer@example.org"
    Then the enrollment response status is 200
    And the enrollment request status is "cancelled"
    And the enrollment history entry 3 goes from "approved" to "cancelled" by "reviewer@example.org"

  Scenario: An invalid status transition is rejected
    When the client creates an enrollment request for course "00000000000000000000000c" as "invalid-transition@example.org"
    Then the enrollment response status is 200
    And the created enrollment request id is remembered
    When the client sets the stored enrollment request status to "approved" by "reviewer@example.org"
    Then the enrollment response status is 200
    When the client sets the stored enrollment request status to "rejected" by "reviewer@example.org" because "Too late to reject an approval."
    Then the enrollment response status is 409
    And the enrollment error code is "INVALID_STATUS_TRANSITION"

  Scenario: Rejection without a reason is rejected
    When the client creates an enrollment request for course "000000000000000000000002" as "noreason@example.org"
    Then the enrollment response status is 200
    And the created enrollment request id is remembered
    When the client sets the stored enrollment request status to "rejected" by "reviewer@example.org" with an empty reason
    Then the enrollment response status is 400
    And the enrollment error code is "INVALID_REQUEST"
    And the enrollment error details include field "reason"

  Scenario: An invalid status value is rejected
    When the client creates an enrollment request for course "000000000000000000000003" as "bad-status@example.org"
    Then the enrollment response status is 200
    And the created enrollment request id is remembered
    When the client sets the stored enrollment request status to "archived" by "reviewer@example.org"
    Then the enrollment response status is 400
    And the enrollment error code is "INVALID_REQUEST"
    And the enrollment error details include field "status"

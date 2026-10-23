Feature: Enrollment requests

  Scenario: A valid enrollment request is created as pending
    When the client creates an enrollment request for course "course-001" as "create-pending@example.org"
    Then the response status is 201
    And the enrollment request status is "pending"
    And the enrollment request records course "course-001" and learner "create-pending@example.org"
    And the enrollment status history has 1 entries
    And the first status history entry starts at pending by system

  Scenario: Creating a request for a missing course returns 404
    When the client creates an enrollment request for course "course-999" as "missing-course@example.org"
    Then the response status is 404
    And the error code is "COURSE_NOT_FOUND"
    And the error details include field "courseId"

  Scenario: Creating a request for a draft or retired course returns 409
    When the client creates an enrollment request for course "course-005" as "draft-course@example.org"
    Then the response status is 409
    And the error code is "COURSE_NOT_ACTIVE"
    When the client creates an enrollment request for course "course-006" as "retired-course@example.org"
    Then the response status is 409
    And the error code is "COURSE_NOT_ACTIVE"

  Scenario: Invalid email or short justification returns 400
    When the client creates an enrollment request for course "course-001" as "not-an-email" with justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details include field "learnerEmail"
    When the client creates an enrollment request for course "course-001" as "short-justification@example.org" with justification "too short"
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details include field "justification"

  Scenario: Duplicate pending or approved requests return 409
    When the client creates an enrollment request for course "course-001" as "duplicate-pending@example.org"
    Then the response status is 201
    When the client creates an enrollment request for course "course-001" as "duplicate-pending@example.org"
    Then the response status is 409
    And the error code is "DUPLICATE_ACTIVE_REQUEST"
    When the client creates an enrollment request for course "course-002" as "duplicate-approved@example.org"
    Then the response status is 201
    When the client sets the last enrollment request status to "approved" by "reviewer@example.org"
    Then the response status is 200
    When the client creates an enrollment request for course "course-002" as "duplicate-approved@example.org"
    Then the response status is 409
    And the error code is "DUPLICATE_ACTIVE_REQUEST"

  Scenario: GET by id returns the request and its status history
    When the client creates an enrollment request for course "course-001" as "get-by-id@example.org"
    Then the response status is 201
    When the client loads the last enrollment request
    Then the response status is 200
    And the enrollment request status is "pending"
    And the enrollment request records course "course-001" and learner "get-by-id@example.org"
    And the enrollment status history has 1 entries
    And the first status history entry starts at pending by system

  Scenario: Listing supports status, courseId, and learnerEmail filters
    When the client creates an enrollment request for course "course-001" as "filter-and@example.org"
    And the client creates an enrollment request for course "course-002" as "filter-and@example.org"
    And the client creates an enrollment request for course "course-004" as "filter-and@example.org"
    And the client sets the last enrollment request status to "approved" by "reviewer@example.org"
    And the client creates an enrollment request for course "course-001" as "filter-other@example.org"
    When the client lists enrollment requests with query "status=pending&courseId=course-001&learnerEmail=filter-and@example.org"
    Then the response status is 200
    And the listed enrollment request count is 1
    And every listed enrollment request has status "pending"
    And every listed enrollment request has course "course-001"
    And every listed enrollment request has learner "filter-and@example.org"
    When the client lists enrollment requests with query "courseId=course-002&learnerEmail=filter-and@example.org"
    Then the listed enrollment request count is 1
    And every listed enrollment request has course "course-002"
    When the client lists enrollment requests with query "learnerEmail=filter-other@example.org"
    Then the listed enrollment request count is 1
    And every listed enrollment request has learner "filter-other@example.org"
    When the client lists enrollment requests with query "status=approved&learnerEmail=filter-and@example.org"
    Then the listed enrollment request count is 1
    And every listed enrollment request has status "approved"

  Scenario: Valid status transitions are applied
    When the client creates an enrollment request for course "course-001" as "transition-approved@example.org"
    And the client sets the last enrollment request status to "approved" by "reviewer@example.org"
    Then the response status is 200
    And the enrollment request status is "approved"
    And the enrollment status history has 2 entries
    When the client creates an enrollment request for course "course-002" as "transition-rejected@example.org"
    And the client sets the last enrollment request status to "rejected" by "reviewer@example.org" because "Learner has not completed the prerequisite course."
    Then the response status is 200
    And the enrollment request status is "rejected"
    And the last status history reason is "Learner has not completed the prerequisite course."
    When the client creates an enrollment request for course "course-003" as "transition-cancelled@example.org"
    And the client sets the last enrollment request status to "cancelled" by "learner@example.org"
    Then the response status is 200
    And the enrollment request status is "cancelled"
    When the client creates an enrollment request for course "course-004" as "transition-approved-cancelled@example.org"
    And the client sets the last enrollment request status to "approved" by "reviewer@example.org"
    And the client sets the last enrollment request status to "cancelled" by "reviewer@example.org"
    Then the response status is 200
    And the enrollment request status is "cancelled"
    And the enrollment status history has 3 entries
    And the last status history entry goes from "approved" to "cancelled" by "reviewer@example.org"

  Scenario: An invalid status transition returns 409
    When the client creates an enrollment request for course "course-007" as "invalid-transition@example.org"
    And the client sets the last enrollment request status to "approved" by "reviewer@example.org"
    And the client sets the last enrollment request status to "rejected" by "reviewer@example.org" because "This transition is not allowed for an approved request."
    Then the response status is 409
    And the error code is "INVALID_STATUS_TRANSITION"
    When the client loads the last enrollment request
    Then the enrollment request status is "approved"
    And the enrollment status history has 2 entries

  Scenario: Rejection without a reason returns 400
    When the client creates an enrollment request for course "course-010" as "needs-reason@example.org"
    And the client sets the last enrollment request status to "rejected" by "reviewer@example.org" without a reason
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details include field "reason"
    When the client loads the last enrollment request
    Then the enrollment request status is "pending"
    And the enrollment status history has 1 entries

  Scenario: Creation and status changes append status history
    When the client creates an enrollment request for course "course-011" as "audit-trail@example.org"
    Then the enrollment status history has 1 entries
    And the first status history entry starts at pending by system
    When the client sets the last enrollment request status to "approved" by "reviewer@example.org"
    Then the response status is 200
    And the enrollment status history has 2 entries
    And the last status history entry goes from "pending" to "approved" by "reviewer@example.org"

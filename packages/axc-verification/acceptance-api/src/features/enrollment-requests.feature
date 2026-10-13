Feature: Enrollment request workflow

  Scenario: Create a pending enrollment request
    When the client creates an enrollment request for course "course-001" as "create@example.org"
    Then the enrollment request responds with status 201
    And the enrollment request status is "pending"
    And the enrollment request history has 1 entry

  Scenario: Missing course returns 404
    When the client creates an enrollment request for course "course-missing" as "missing-course@example.org"
    Then the enrollment request responds with status 404
    And the enrollment request error code is "COURSE_NOT_FOUND"

  Scenario: Inactive course returns 409
    When the client creates an enrollment request for course "course-003" as "inactive-course@example.org"
    Then the enrollment request responds with status 409
    And the enrollment request error code is "COURSE_NOT_ACTIVE"

  Scenario: Invalid email and short justification return 400
    When the client creates an enrollment request with email "not-an-email" and justification "too short"
    Then the enrollment request responds with status 400
    And the enrollment request error code is "INVALID_REQUEST"

  Scenario: Duplicate pending request returns 409
    When the client creates an enrollment request for course "course-001" as "duplicate@example.org"
    And the client creates an enrollment request for course "course-001" as "duplicate@example.org"
    Then the enrollment request responds with status 409
    And the enrollment request error code is "DUPLICATE_ACTIVE_REQUEST"

  Scenario: Retrieve an enrollment request by id
    When the client creates an enrollment request for course "course-001" as "fetch@example.org"
    And the client requests the last enrollment request by id
    Then the enrollment request responds with status 200
    And the enrollment request status is "pending"
    And the enrollment request history has 1 entry

  Scenario: List enrollment requests can filter by status, course, and email
    When the client creates an enrollment request for course "course-001" as "filter@example.org"
    And the client lists enrollment requests with query "status=pending&courseId=course-001&learnerEmail=filter@example.org"
    Then the enrollment request responds with status 200
    And the enrollment request list contains 1 item

  Scenario: Approve a pending request
    When the client creates an enrollment request for course "course-001" as "approve@example.org"
    And the client updates the last enrollment request status to "approved" as "reviewer@example.org"
    Then the enrollment request responds with status 200
    And the enrollment request status is "approved"
    And the enrollment request history has 2 entries

  Scenario: Reject a pending request with a reason
    When the client creates an enrollment request for course "course-001" as "reject@example.org"
    And the client rejects the last enrollment request as "reviewer@example.org" with reason "Learner has not completed the prerequisite course."
    Then the enrollment request responds with status 200
    And the enrollment request status is "rejected"
    And the enrollment request history has 2 entries

  Scenario: Cancel a pending request
    When the client creates an enrollment request for course "course-001" as "cancel@example.org"
    And the client updates the last enrollment request status to "cancelled" as "reviewer@example.org"
    Then the enrollment request responds with status 200
    And the enrollment request status is "cancelled"

  Scenario: Cancel an approved request
    When the client creates an enrollment request for course "course-001" as "approved-cancel@example.org"
    And the client updates the last enrollment request status to "approved" as "reviewer@example.org"
    And the client updates the last enrollment request status to "cancelled" as "reviewer@example.org"
    Then the enrollment request responds with status 200
    And the enrollment request status is "cancelled"
    And the enrollment request history has 3 entries

  Scenario: Invalid transition returns 409
    When the client creates an enrollment request for course "course-001" as "invalid-transition@example.org"
    And the client updates the last enrollment request status to "approved" as "reviewer@example.org"
    And the client rejects the last enrollment request as "reviewer@example.org" with reason "Too late to reject."
    Then the enrollment request responds with status 409
    And the enrollment request error code is "INVALID_STATUS_TRANSITION"

  Scenario: Rejection without a reason returns 400
    When the client creates an enrollment request for course "course-001" as "missing-reason@example.org"
    And the client updates the last enrollment request status to "rejected" as "reviewer@example.org"
    Then the enrollment request responds with status 400
    And the enrollment request error code is "INVALID_REQUEST"

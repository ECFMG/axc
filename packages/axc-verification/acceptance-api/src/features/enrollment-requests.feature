Feature: Enrollment requests

  @B-AC1
  Scenario: B-AC1 course search still returns a page
    When the client requests "/api/courses"
    Then the response status is 200
    And the course page uses defaults

  @B-AC2
  Scenario: B-AC2 creates a pending enrollment request
    When the client creates an enrollment request for "course-001" as "b-ac2@example.org" with justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 201
    And the enrollment request status is "pending"
    And the enrollment status history has 1 entries
    And the first status history entry starts at pending

  @B-AC3
  Scenario: B-AC3 missing course returns 404
    When the client creates an enrollment request for "course-missing" as "b-ac3@example.org" with justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 404
    And the error code is "COURSE_NOT_FOUND"

  @B-AC4
  Scenario: B-AC4 draft and retired courses return 409
    When the client creates an enrollment request for "course-003" as "b-ac4-draft@example.org" with justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 409
    And the error code is "COURSE_NOT_ACTIVE"
    When the client creates an enrollment request for "course-004" as "b-ac4-retired@example.org" with justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 409
    And the error code is "COURSE_NOT_ACTIVE"

  @B-AC5
  Scenario: B-AC5 invalid email and short justification return 400
    When the client creates an enrollment request for "course-001" as "not-an-email" with justification "too short"
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error lists 2 details
    And the error details include field "learnerEmail"
    And the error details include field "justification"

  @B-AC6
  Scenario: B-AC6 duplicate pending or approved requests return 409
    When the client creates an enrollment request for "course-001" as "b-ac6-pending@example.org" with justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 201
    When the client creates an enrollment request for "course-001" as "b-ac6-pending@example.org" with justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 409
    And the error code is "DUPLICATE_ACTIVE_REQUEST"
    When the client creates an enrollment request for "course-002" as "b-ac6-approved@example.org" with justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 201
    When the client sets the created enrollment status to "approved" as "reviewer@example.org"
    Then the response status is 200
    When the client creates an enrollment request for "course-002" as "b-ac6-approved@example.org" with justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 409
    And the error code is "DUPLICATE_ACTIVE_REQUEST"

  @B-AC7
  Scenario: B-AC7 returns the request including status history
    When the client creates an enrollment request for "course-005" as "b-ac7@example.org" with justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 201
    When the client requests the created enrollment request
    Then the response status is 200
    And the enrollment request status is "pending"
    And the enrollment status history has 1 entries
    When the client requests "/api/enrollment-requests/enroll-does-not-exist"
    Then the response status is 404
    And the error code is "ENROLLMENT_REQUEST_NOT_FOUND"

  @B-AC8
  Scenario: B-AC8 filters enrollment requests
    When the client creates an enrollment request for "course-005" as "b-ac8-match@example.org" with justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 201
    When the client creates an enrollment request for "course-006" as "b-ac8-other@example.org" with justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 201
    When the client requests "/api/enrollment-requests?status=pending&courseId=course-005&learnerEmail=b-ac8-match@example.org"
    Then the response status is 200
    And the enrollment list contains only status "pending" course "course-005" and learner "b-ac8-match@example.org"
    When the client requests "/api/enrollment-requests?status=nope"
    Then the response status is 400
    And the error code is "INVALID_REQUEST"

  @B-AC9
  Scenario: B-AC9 supports valid status transitions
    When the client creates an enrollment request for "course-006" as "b-ac9-approve@example.org" with justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 201
    When the client sets the created enrollment status to "approved" as "reviewer@example.org"
    Then the response status is 200
    And the enrollment request status is "approved"
    When the client sets the created enrollment status to "cancelled" as "reviewer@example.org"
    Then the response status is 200
    And the enrollment request status is "cancelled"
    When the client creates an enrollment request for "course-008" as "b-ac9-reject@example.org" with justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 201
    When the client rejects the created enrollment request as "reviewer@example.org" because "Learner has not completed the prerequisite course."
    Then the response status is 200
    And the enrollment request status is "rejected"
    When the client creates an enrollment request for "course-009" as "b-ac9-cancel@example.org" with justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 201
    When the client sets the created enrollment status to "cancelled" as "reviewer@example.org"
    Then the response status is 200
    And the enrollment request status is "cancelled"

  @B-AC10
  Scenario: B-AC10 invalid transitions return 409
    When the client creates an enrollment request for "course-011" as "b-ac10@example.org" with justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 201
    When the client sets the created enrollment status to "approved" as "reviewer@example.org"
    Then the response status is 200
    When the client rejects the created enrollment request as "reviewer@example.org" because "Approved requests cannot be rejected."
    Then the response status is 409
    And the error code is "INVALID_STATUS_TRANSITION"

  @B-AC11
  Scenario: B-AC11 rejection requires a reason and invalid status is 400
    When the client creates an enrollment request for "course-001" as "b-ac11@example.org" with justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 201
    When the client sets the created enrollment status to "nope" as "reviewer@example.org"
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details include field "status"
    When the client sets the created enrollment status to "rejected" as "reviewer@example.org"
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details include field "reason"

  @B-AC12
  Scenario: B-AC12 creation and status changes append status history
    When the client creates an enrollment request for "course-008" as "b-ac12@example.org" with justification "I need this course to prepare for upcoming secure development work."
    Then the response status is 201
    And the enrollment status history has 1 entries
    And the first status history entry starts at pending
    And the latest status history entry is "pending"
    When the client sets the created enrollment status to "approved" as "reviewer@example.org"
    Then the response status is 200
    And the enrollment status history has 2 entries
    And the latest status history entry is "approved"
    When the client sets the created enrollment status to "cancelled" as "reviewer@example.org"
    Then the response status is 200
    And the enrollment status history has 3 entries
    And the latest status history entry is "cancelled"

  # ac-meta: B-AC13
  # ac-meta: B-AC14
  # ac-meta: B-AC15

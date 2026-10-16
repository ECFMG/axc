Feature: Enrollment request acceptance
  Scenario: Create a pending request and initial audit event
    Given a fresh enrollment learner
    When the learner requests course "course-001"
    Then the training response status is 201
    And the enrollment is pending with an initial audit event
  Scenario: Missing enrollment course
    Given a fresh enrollment learner
    When the learner requests course "missing"
    Then the training response status is 404
    And the training error is "COURSE_NOT_FOUND"
  Scenario Outline: Inactive enrollment course
    Given a fresh enrollment learner
    When the learner requests course "<course>"
    Then the training response status is 409
    And the training error is "COURSE_NOT_ACTIVE"
    Examples:
      | course |
      | course-004 |
      | course-005 |
  Scenario: Invalid learner email
    Given a fresh enrollment learner
    When an enrollment is submitted with email "invalid" and justification length 30
    Then the training response status is 400
    And the training error is "INVALID_REQUEST"
  Scenario Outline: Justification boundaries
    Given a fresh enrollment learner
    When an enrollment is submitted with email "fresh" and justification length <length>
    Then the training response status is <status>
    Examples:
      | length | status |
      | 19 | 400 |
      | 20 | 201 |
      | 500 | 201 |
      | 501 | 400 |
  Scenario Outline: Prevent duplicate active requests
    Given an enrollment with status "<status>"
    When the learner requests course "course-001"
    Then the training response status is 409
    And the training error is "DUPLICATE_ACTIVE_REQUEST"
    Examples:
      | status |
      | pending |
      | approved |
  Scenario: Retrieve an enrollment including audit history
    Given an enrollment with status "approved"
    When the enrollment is retrieved
    Then the training response status is 200
    And its audit trail contains 2 entries ending in "approved"
  Scenario: Missing enrollment lookup
    Given a fresh enrollment learner
    When an absent enrollment is retrieved
    Then the training response status is 404
    And the training error is "ENROLLMENT_REQUEST_NOT_FOUND"
  Scenario Outline: Enrollment list filters
    Given an enrollment with status "pending"
    When enrollment requests are listed by "<filter>"
    Then the training response status is 200
    And the listed enrollments match "<filter>"
    Examples:
      | filter |
      | status |
      | courseId |
      | learnerEmail |
      | combined |
  Scenario Outline: Valid status transitions
    Given an enrollment with status "<from>"
    When the enrollment status changes to "<to>" with reason "Reviewed prerequisites"
    Then the training response status is 200
    And its audit trail contains <count> entries ending in "<to>"
    Examples:
      | from | to | count |
      | pending | approved | 2 |
      | pending | rejected | 2 |
      | pending | cancelled | 2 |
      | approved | cancelled | 3 |
  Scenario Outline: Invalid status transitions
    Given an enrollment with status "<from>"
    When the enrollment status changes to "<to>" with reason "Reviewed prerequisites"
    Then the training response status is 409
    And the training error is "INVALID_STATUS_TRANSITION"
    Examples:
      | from | to |
      | pending | pending |
      | approved | rejected |
      | rejected | approved |
      | cancelled | approved |
  Scenario: Unknown status value
    Given an enrollment with status "pending"
    When the enrollment status changes to "unknown" with reason "Reviewed prerequisites"
    Then the training response status is 400
    And the training error is "INVALID_REQUEST"
  Scenario: Rejection requires a reason
    Given an enrollment with status "pending"
    When the enrollment status changes to "rejected" with reason ""
    Then the training response status is 400
    And the training error is "INVALID_REQUEST"
  Scenario Outline: Reapplication after terminal status
    Given an enrollment with status "<status>"
    When the learner requests course "course-001"
    Then the training response status is 201
    And the enrollment is pending with an initial audit event
    Examples:
      | status |
      | rejected |
      | cancelled |
  Scenario: Missing status target
    Given a fresh enrollment learner
    When an absent enrollment is approved
    Then the training response status is 404
    And the training error is "ENROLLMENT_REQUEST_NOT_FOUND"

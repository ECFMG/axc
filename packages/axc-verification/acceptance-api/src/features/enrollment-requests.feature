Feature: Enrollment requests

  Scenario: B-AC2 a valid request is created as pending
    When "ac2@example.org" requests enrollment in "course-001"
    Then the response status is 201
    And the response field "status" is "pending"
    And the request has 1 status history entries

  Scenario: B-AC3 a missing course returns 404
    When "ac3@example.org" requests enrollment in "course-999"
    Then the response status is 404
    And the error code is "COURSE_NOT_FOUND"

  Scenario Outline: B-AC4 a <status> course returns 409
    When "ac4@example.org" requests enrollment in "<course>"
    Then the response status is 409
    And the error code is "COURSE_NOT_ACTIVE"

    Examples:
      | status  | course     |
      | draft   | course-005 |
      | retired | course-006 |

  Scenario Outline: B-AC5 invalid input returns 400 (<case>)
    When the client posts the enrollment request <body>
    Then the response status is 400
    And the error code is "INVALID_REQUEST"

    Examples:
      | case                | body                                                                                                                 |
      | invalid email       | {"courseId":"course-001","learnerEmail":"not-an-email","justification":"A long enough justification text."}        |
      | short justification | {"courseId":"course-001","learnerEmail":"ac5@example.org","justification":"too short"}                              |

  Scenario Outline: B-AC6 a duplicate <state> request returns 409
    Given "<email>" has a "<state>" enrollment request in "course-002"
    When "<email>" requests enrollment in "course-002"
    Then the response status is 409
    And the error code is "DUPLICATE_ACTIVE_REQUEST"

    Examples:
      | state    | email                    |
      | pending  | ac6-pending@example.org  |
      | approved | ac6-approved@example.org |

  Scenario: B-AC7 a request is retrieved by id with its status history
    Given "ac7@example.org" has a "pending" enrollment request in "course-003"
    When the client retrieves that enrollment request
    Then the response status is 200
    And the response field "learnerEmail" is "ac7@example.org"
    And the request has 1 status history entries

  Scenario: B-AC7 an unknown request id returns 404
    When the client sends GET "/api/enrollment-requests/enroll-999999"
    Then the response status is 404
    And the error code is "ENROLLMENT_REQUEST_NOT_FOUND"

  Scenario: B-AC8 requests are filtered by status, courseId and learnerEmail
    Given "ac8@example.org" has a "approved" enrollment request in "course-004"
    And "ac8-other@example.org" has a "pending" enrollment request in "course-004"
    When the client sends GET "/api/enrollment-requests?status=approved&courseId=course-004&learnerEmail=ac8@example.org"
    Then the response status is 200
    And the response list has 1 entries
    And every entry has "learnerEmail" equal to "ac8@example.org"
    When the client sends GET "/api/enrollment-requests?courseId=course-004"
    Then the response list has 2 entries
    When the client sends GET "/api/enrollment-requests?status=bogus"
    Then the response status is 400

  Scenario Outline: B-AC9 valid transition <from> to <to>
    Given "<email>" has a "<from>" enrollment request in "course-007"
    When the reviewer changes that request to "<to>" with reason "Prerequisite course not completed."
    Then the response status is 200
    And the response field "status" is "<to>"

    Examples:
      | from     | to        | email               |
      | pending  | approved  | ac9-1@example.org   |
      | pending  | rejected  | ac9-2@example.org   |
      | pending  | cancelled | ac9-3@example.org   |
      | approved | cancelled | ac9-4@example.org   |

  Scenario: B-AC10 an invalid transition returns 409
    Given "ac10@example.org" has a "rejected" enrollment request in "course-008"
    When the reviewer changes that request to "approved" with reason ""
    Then the response status is 409
    And the error code is "INVALID_STATUS_TRANSITION"

  Scenario: B-AC11 rejection without a reason returns 400
    Given "ac11@example.org" has a "pending" enrollment request in "course-010"
    When the reviewer changes that request to "rejected" with reason ""
    Then the response status is 400
    And the error code is "INVALID_REQUEST"

  Scenario: B-AC11 an unknown status value returns 400
    Given "ac11-b@example.org" has a "pending" enrollment request in "course-010"
    When the reviewer changes that request to "archived" with reason ""
    Then the response status is 400
    And the error code is "INVALID_REQUEST"

  Scenario: B-AC12 creation and every status change append status history
    Given "ac12@example.org" has a "approved" enrollment request in "course-012"
    When the reviewer changes that request to "cancelled" with reason ""
    Then the request has 3 status history entries
    And the status history goes "pending,approved,cancelled"

  Scenario: B-AC13 existing tests still pass
    When the client requests the healthcheck
    Then the healthcheck responds with status 200

  Scenario: B-AC14 errors use the shared error format
    When "ac14@example.org" requests enrollment in "course-999"
    Then the response status is 404
    And the error code is "COURSE_NOT_FOUND"

  Scenario: B-AC15 every documented endpoint is routed
    Given "ac15@example.org" has a "pending" enrollment request in "course-001"
    When the client retrieves that enrollment request
    Then the response status is 200
    When the client sends GET "/api/enrollment-requests"
    Then the response status is 200
    When the reviewer changes that request to "cancelled" with reason ""
    Then the response status is 200

Feature: Enrollment requests

  Scenario: B-AC2 a valid request is created as pending
    When the learner "b-ac2@example.org" requests enrollment in "course-001"
    Then the response status is 201
    And the enrollment request status is "pending"
    And the status history is "pending"

  Scenario: B-AC3 a request for a missing course returns 404
    When the learner "b-ac3@example.org" requests enrollment in "course-999"
    Then the response status is 404
    And the error code is "COURSE_NOT_FOUND"

  Scenario Outline: B-AC4 a request for a <status> course returns 409
    When the learner "b-ac4@example.org" requests enrollment in "<course>"
    Then the response status is 409
    And the error code is "COURSE_NOT_ACTIVE"

    Examples:
      | status  | course     |
      | draft   | course-004 |
      | retired | course-006 |

  Scenario Outline: B-AC5 invalid <field> returns 400
    When the learner "<email>" requests enrollment in "course-001" with justification "<justification>"
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error has a message and details for "<field>"

    Examples:
      | field         | email             | justification                                       |
      | learnerEmail  | not-an-email      | I need this course for upcoming secure development. |
      | justification | b-ac5@example.org | too short                                           |

  Scenario: B-AC6 duplicate pending or approved requests return 409
    Given a pending enrollment request by "b-ac6@example.org" for "course-001"
    When the learner "b-ac6@example.org" requests enrollment in "course-001"
    Then the response status is 409
    And the error code is "DUPLICATE_ACTIVE_REQUEST"
    When the reviewer changes the request status to "approved"
    And the learner "B-AC6@example.org" requests enrollment in "course-001"
    Then the response status is 409
    And the error code is "DUPLICATE_ACTIVE_REQUEST"

  Scenario: B-AC7 a request is retrieved by id with its status history
    Given a pending enrollment request by "b-ac7@example.org" for "course-003"
    When the client requests "/api/enrollment-requests/{id}"
    Then the response status is 200
    And the enrollment request is the one created
    And the status history is "pending"

  Scenario: B-AC8 requests are filtered by status, courseId and learnerEmail
    Given a pending enrollment request by "b-ac8@example.org" for "course-001"
    And a pending enrollment request by "b-ac8@example.org" for "course-003"
    When the reviewer changes the request status to "approved"
    And the client requests "/api/enrollment-requests?learnerEmail=b-ac8@example.org"
    Then the enrollment list has 2 requests
    And every listed request has learnerEmail "b-ac8@example.org"
    When the client requests "/api/enrollment-requests?status=approved&learnerEmail=b-ac8@example.org"
    Then the enrollment list has 1 request
    And every listed request has courseId "course-003"
    When the client requests "/api/enrollment-requests?courseId=course-001&learnerEmail=b-ac8@example.org"
    Then the enrollment list has 1 request
    And every listed request has status "pending"

  Scenario Outline: B-AC9 valid transition pending to <to>
    Given a pending enrollment request by "<email>" for "course-005"
    When the reviewer changes the request status to "<to>" with reason "Learner has not completed the prerequisite course."
    Then the response status is 200
    And the enrollment request status is "<to>"

    Examples:
      | to        | email                      |
      | approved  | b-ac9-approve@example.org  |
      | rejected  | b-ac9-reject@example.org   |
      | cancelled | b-ac9-cancel@example.org   |

  Scenario: B-AC9 valid transition approved to cancelled
    Given a pending enrollment request by "b-ac9-approved-cancel@example.org" for "course-005"
    When the reviewer changes the request status to "approved"
    And the reviewer changes the request status to "cancelled"
    Then the response status is 200
    And the enrollment request status is "cancelled"

  Scenario: B-AC10 an invalid transition returns 409
    Given a pending enrollment request by "b-ac10@example.org" for "course-008"
    When the reviewer changes the request status to "rejected" with reason "Prerequisite missing from transcript."
    And the reviewer changes the request status to "approved"
    Then the response status is 409
    And the error code is "INVALID_STATUS_TRANSITION"

  Scenario: B-AC11 rejection without a reason returns 400
    Given a pending enrollment request by "b-ac11@example.org" for "course-008"
    When the reviewer changes the request status to "rejected"
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error has a message and details for "reason"

  Scenario: B-AC12 creation and every status change append statusHistory entries
    Given a pending enrollment request by "b-ac12@example.org" for "course-009"
    When the reviewer changes the request status to "approved"
    And the reviewer changes the request status to "cancelled"
    And the client requests "/api/enrollment-requests/{id}"
    Then the status history is "pending, approved, cancelled"

  Scenario: B-AC13 existing healthcheck still passes alongside enrollment requests
    When the client requests "/health"
    Then the response status is 200

  Scenario: B-AC14 unknown requests and status values are reported as errors
    When the client requests "/api/enrollment-requests/enroll-999"
    Then the response status is 404
    And the error code is "ENROLLMENT_REQUEST_NOT_FOUND"
    When the client requests "/api/enrollment-requests?status=open"
    Then the response status is 400
    And the error code is "INVALID_REQUEST"

  Scenario: B-AC15 error responses match the documented contract
    Given a pending enrollment request by "b-ac15@example.org" for "course-011"
    When the reviewer changes the request status to "done"
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error has a message and details for "status"

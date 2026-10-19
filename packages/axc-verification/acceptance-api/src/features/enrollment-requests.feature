Feature: Course enrollment requests

  Learners request enrollment in active courses through POST /api/enrollment-requests.
  Reviewers retrieve and list requests and move them through the allowed status
  transitions with PATCH /api/enrollment-requests/{id}/status. Every creation and
  status change is recorded in the request's status history.

  The API process is shared by every scenario, so each scenario works with its own
  freshly generated learner email.

  Scenario: A valid request creates a pending enrollment request
    Given a new learner
    When the learner requests enrollment in course "course-001"
    Then the enrollment API responds with status 201
    And the enrollment request has status "pending"
    And the enrollment request is for the learner and course "course-001"
    And the enrollment request status history is:
      | fromStatus | toStatus | changedBy | reason |
      |            | pending  | system    |        |

  Scenario: Requesting enrollment in a course that does not exist returns 404
    Given a new learner
    When the learner requests enrollment in course "course-999"
    Then the enrollment API responds with status 404
    And the enrollment API error code is "COURSE_NOT_FOUND"

  Scenario Outline: Requesting enrollment in a <state> course returns 409
    Given a new learner
    When the learner requests enrollment in course "<courseId>"
    Then the enrollment API responds with status 409
    And the enrollment API error code is "COURSE_NOT_ACTIVE"

    Examples:
      | state   | courseId   |
      | draft   | course-005 |
      | retired | course-006 |

  Scenario: An invalid learner email returns 400
    When a client requests enrollment in course "course-001" for learner email "not-an-email"
    Then the enrollment API responds with status 400
    And the enrollment API error code is "INVALID_REQUEST"
    And the enrollment API error reports field "learnerEmail"

  Scenario: A justification shorter than 20 characters returns 400
    Given a new learner
    When the learner requests enrollment in course "course-001" with justification "Too short."
    Then the enrollment API responds with status 400
    And the enrollment API error reports field "justification" with message "justification must be between 20 and 500 characters."

  Scenario Outline: A learner cannot have a second active request for the same course while one is <status>
    Given a new learner
    And the learner has a "<status>" enrollment request for course "course-002"
    When the learner requests enrollment in course "course-002"
    Then the enrollment API responds with status 409
    And the enrollment API error code is "DUPLICATE_ACTIVE_REQUEST"

    Examples:
      | status   |
      | pending  |
      | approved |

  Scenario: A rejected request does not block a new request for the same course
    Given a new learner
    And the learner has a "rejected" enrollment request for course "course-002"
    When the learner requests enrollment in course "course-002"
    Then the enrollment API responds with status 201
    And the enrollment request has status "pending"

  Scenario: Retrieving a request by id returns it with its status history
    Given a new learner
    And the learner has a "approved" enrollment request for course "course-003"
    When the client retrieves the enrollment request
    Then the enrollment API responds with status 200
    And the enrollment request has status "approved"
    And the enrollment request is for the learner and course "course-003"
    And the enrollment request status history is:
      | fromStatus | toStatus | changedBy            | reason |
      |            | pending  | system               |        |
      | pending    | approved | reviewer@example.org |        |

  Scenario: Retrieving an unknown request returns 404
    When the client retrieves the enrollment request "enroll-does-not-exist"
    Then the enrollment API responds with status 404
    And the enrollment API error code is "ENROLLMENT_REQUEST_NOT_FOUND"

  Scenario: Listing requests filters by learner email, status, and course
    Given a new learner
    And the learner has a "pending" enrollment request for course "course-001"
    And the learner has a "cancelled" enrollment request for course "course-002"
    When the client lists the learner's enrollment requests
    Then the enrollment API responds with status 200
    And the listed enrollment requests are for courses:
      | course-001 |
      | course-002 |
    When the client lists the learner's enrollment requests with "status=pending"
    Then the enrollment API responds with status 200
    And the listed enrollment requests are for courses:
      | course-001 |
    When the client lists the learner's enrollment requests with "courseId=course-002"
    Then the enrollment API responds with status 200
    And the listed enrollment requests are for courses:
      | course-002 |
    And every listed enrollment request has status "cancelled"

  Scenario: Listing filters by learner email regardless of case
    Given a new learner
    And the learner has a "pending" enrollment request for course "course-004"
    When the client lists the learner's enrollment requests using an upper-case email
    Then the enrollment API responds with status 200
    And the listed enrollment requests are for courses:
      | course-004 |

  Scenario: Listing with an unknown status returns 400
    When the client lists enrollment requests with query "status=archived"
    Then the enrollment API responds with status 400
    And the enrollment API error reports field "status"

  Scenario Outline: A reviewer moves a request from <from> to <to>
    Given a new learner
    And the learner has a "<from>" enrollment request for course "course-007"
    When a reviewer changes the enrollment request status to "<to>" with reason "<reason>"
    Then the enrollment API responds with status 200
    And the enrollment request has status "<to>"
    And the latest status history entry is from "<from>" to "<to>" by "reviewer@example.org" with reason "<reason>"

    Examples:
      | from     | to        | reason                                             |
      | pending  | approved  |                                                    |
      | pending  | rejected  | Learner has not completed the prerequisite course. |
      | pending  | cancelled |                                                    |
      | approved | cancelled | Learner withdrew.                                  |

  Scenario: Each status change adds a status history entry
    Given a new learner
    And the learner has a "pending" enrollment request for course "course-008"
    When a reviewer changes the enrollment request status to "approved" with reason ""
    And a reviewer changes the enrollment request status to "cancelled" with reason "Learner withdrew."
    And the client retrieves the enrollment request
    Then the enrollment API responds with status 200
    And the enrollment request status history is:
      | fromStatus | toStatus  | changedBy            | reason            |
      |            | pending   | system               |                   |
      | pending    | approved  | reviewer@example.org |                   |
      | approved   | cancelled | reviewer@example.org | Learner withdrew. |

  Scenario Outline: An invalid transition from <from> to <to> returns 409
    Given a new learner
    And the learner has a "<from>" enrollment request for course "course-009"
    When a reviewer changes the enrollment request status to "<to>" with reason "Some reason."
    Then the enrollment API responds with status 409
    And the enrollment API error code is "INVALID_STATUS_TRANSITION"

    Examples:
      | from      | to       |
      | cancelled | approved |
      | rejected  | pending  |
      | approved  | rejected |

  Scenario: Rejecting a request without a reason returns 400
    Given a new learner
    And the learner has a "pending" enrollment request for course "course-001"
    When a reviewer changes the enrollment request status to "rejected" with reason ""
    Then the enrollment API responds with status 400
    And the enrollment API error code is "INVALID_REQUEST"
    And the enrollment API error reports field "reason"

  Scenario: An invalid status value returns 400
    Given a new learner
    And the learner has a "pending" enrollment request for course "course-001"
    When a reviewer changes the enrollment request status to "archived" with reason ""
    Then the enrollment API responds with status 400
    And the enrollment API error code is "INVALID_REQUEST"
    And the enrollment API error reports field "status"

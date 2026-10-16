Feature: Course enrollment requests
  Scenario: Create retrieve and filter a pending request
    When the learner requests enrollment for "course-001"
    Then the workflow creates a pending request with its initial history
    When the learner retrieves that request
    Then the workflow returns that request including history
    When the learner filters requests by each field and their combination
    Then only matching requests are returned

  Scenario Outline: Course eligibility
    When the learner requests enrollment for "<course>"
    Then the workflow responds with <status> and code "<code>"
    Examples:
      | course      | status | code              |
      | missing     | 404    | COURSE_NOT_FOUND  |
      | course-004  | 409    | COURSE_NOT_ACTIVE |
      | course-005  | 409    | COURSE_NOT_ACTIVE |

  Scenario Outline: Validate learner input
    When the learner submits invalid "<field>" with "<value>"
    Then the workflow responds with 400 and code "INVALID_REQUEST"
    Examples:
      | field         | value |
      | learnerEmail  | bad   |
      | justification | short |

  Scenario Outline: Prevent duplicate active requests
    Given the learner has a "<status>" enrollment request
    When the learner requests enrollment for "course-001"
    Then the workflow responds with 409 and code "DUPLICATE_ACTIVE_REQUEST"
    Examples:
      | status   |
      | pending  |
      | approved |

  Scenario Outline: Valid status transitions and audit trail
    Given the learner has a "<from>" enrollment request
    When the reviewer changes its status to "<to>" with reason "A documented review decision"
    Then the workflow records a transition from "<from>" to "<to>"
    Examples:
      | from     | to        |
      | pending  | approved  |
      | pending  | rejected  |
      | pending  | cancelled |
      | approved | cancelled |

  Scenario Outline: Invalid transitions
    Given the learner has a "<from>" enrollment request
    When the reviewer changes its status to "<to>" with reason "A documented review decision"
    Then the workflow responds with 409 and code "INVALID_STATUS_TRANSITION"
    Examples:
      | from      | to       |
      | approved  | rejected |
      | rejected  | approved |
      | cancelled | pending  |
      | pending   | pending  |

  Scenario Outline: Rejection requires a reason
    Given the learner has a "pending" enrollment request
    When the reviewer changes its status to "rejected" with reason "<reason>"
    Then the workflow responds with 400 and code "INVALID_REQUEST"
    Examples:
      | reason |
      |        |

  Scenario Outline: Terminal requests allow a new request
    Given the learner has a "<status>" enrollment request
    When the learner requests enrollment for "course-001"
    Then the workflow creates a pending request with its initial history
    Examples:
      | status    |
      | rejected  |
      | cancelled |

  Scenario: Missing request and invalid status value
    When the learner retrieves an unknown enrollment request
    Then the workflow responds with 404 and code "ENROLLMENT_REQUEST_NOT_FOUND"
    Given the learner has a "pending" enrollment request
    When the reviewer changes its status to "unknown" with reason "A reason"
    Then the workflow responds with 400 and code "INVALID_REQUEST"

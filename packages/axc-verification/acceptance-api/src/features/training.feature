Feature: Course search and enrollment workflow
  Scenario: Course list uses default pagination
    When the learner searches courses with ""
    Then the course page has page 1 size 10 and total 12

  Scenario Outline: Course filters return only matching courses
    When the learner searches courses with "<query>"
    Then every course matches field "<field>" value "<value>"
    Examples:
      | query | field | value |
      | modality=online | modality | online |
      | modality=in-person | modality | in-person |
      | modality=hybrid | modality | hybrid |
      | status=active | status | active |
      | status=draft | status | draft |
      | status=retired | status | retired |
      | tag=AI | tags | ai |

  Scenario: Keyword modality and status combine
    When the learner searches courses with "q=SECURITY&modality=online&status=active"
    Then every course matches keyword "security", modality "online", and status "active"

  Scenario: Keyword tag and status combine
    When the learner searches courses with "q=SECURITY&tag=AI&status=active"
    Then every course matches keyword "security", tag "ai", and status "active"

  Scenario Outline: Keyword matches catalog fields case insensitively
    When the learner searches courses with "q=<keyword>"
    Then the course page includes "<title>"
    Examples:
      | keyword | title |
      | SECURITY | AI Security Foundations |
      | PRACTICAL | Secure TypeScript |
      | ENGINEERING | Secure TypeScript |

  Scenario: Course paging includes totals
    When the learner searches courses with "page=2&pageSize=5"
    Then the course page has page 2 size 5 and total 12

  Scenario Outline: Courses sort in ascending order
    When the learner searches courses with "sort=<sort>&pageSize=50"
    Then courses are sorted by "<sort>"
    Examples:
      | sort |
      | title |
      | createdAt |
      | updatedAt |

  Scenario: Course search returns an empty page
    When the learner searches courses with "q=no-such-training"
    Then the course page has 0 items and 0 total pages

  Scenario Outline: Invalid course input is rejected
    When the learner searches courses with "<query>"
    Then training responds 400 with error "INVALID_QUERY_PARAMETER"
    Examples:
      | query |
      | modality=virtual |
      | status=pending |
      | page=0 |
      | pageSize=51 |
      | sort=bad |

  Scenario: Create a pending request with creation audit
    Given a fresh learner
    When the learner requests course "course-001" with email "valid" and justification length 20
    Then a pending enrollment is created with 1 system history entry

  Scenario Outline: Enrollment creation validates course and input
    Given a fresh learner
    When the learner requests course "<course>" with email "<email>" and justification length <length>
    Then training responds <http> with error "<error>"
    Examples:
      | course | email | length | http | error |
      | missing | valid | 20 | 404 | COURSE_NOT_FOUND |
      | course-005 | valid | 20 | 409 | COURSE_NOT_ACTIVE |
      | course-009 | valid | 20 | 409 | COURSE_NOT_ACTIVE |
      | course-001 | invalid | 20 | 400 | INVALID_REQUEST |
      | course-001 | valid | 19 | 400 | INVALID_REQUEST |
      | course-001 | valid | 501 | 400 | INVALID_REQUEST |

  Scenario Outline: Active requests prevent duplicates
    Given a "<status>" enrollment request
    When the learner repeats the enrollment with uppercase email
    Then training responds 409 with error "DUPLICATE_ACTIVE_REQUEST"
    Examples:
      | status |
      | pending |
      | approved |

  Scenario Outline: Closed requests allow a new enrollment
    Given a "<status>" enrollment request
    When the learner repeats the enrollment with uppercase email
    Then a pending enrollment is created with 1 system history entry
    Examples:
      | status |
      | rejected |
      | cancelled |

  Scenario: Retrieve a request and audit history
    Given a "pending" enrollment request
    When the learner retrieves the enrollment
    Then the enrollment has status "pending" and 1 history entries

  Scenario: Missing request retrieval
    When the learner retrieves a missing enrollment
    Then training responds 404 with error "ENROLLMENT_REQUEST_NOT_FOUND"

  Scenario Outline: Enrollment list filters requests
    Given two requests for different learners and courses
    When the learner lists enrollments using "<filter>"
    Then every listed request matches the selected enrollment filters
    Examples:
      | filter |
      | status |
      | courseId |
      | learnerEmail |
      | combined |

  Scenario: Unmatched enrollment filter returns empty array
    Given a fresh learner
    When the learner lists enrollments for an unknown course
    Then the enrollment list contains 0 requests

  Scenario Outline: Allowed status changes append audit entries
    Given a "<from>" enrollment request
    When the reviewer changes status to "<to>" with reason "<reason>"
    Then the enrollment has status "<to>" and <entries> history entries
    And the latest history records reviewer "reviewer@example.org" from "<from>" with reason "<reason>"
    Examples:
      | from | to | reason | entries |
      | pending | approved | omitted | 2 |
      | pending | rejected | Missing prerequisite | 2 |
      | pending | cancelled | No longer needed | 2 |
      | approved | cancelled | omitted | 3 |

  Scenario Outline: Forbidden status changes are conflicts
    Given a "<from>" enrollment request
    When the reviewer changes status to "<to>" with reason "test"
    Then training responds 409 with error "INVALID_STATUS_TRANSITION"
    Examples:
      | from | to |
      | pending | pending |
      | approved | rejected |
      | rejected | approved |
      | cancelled | approved |

  Scenario Outline: Rejection requires a reason
    Given a "pending" enrollment request
    When the reviewer changes status to "rejected" with reason "<reason>"
    Then training responds 400 with error "INVALID_REQUEST"
    Examples:
      | reason |
      | omitted |
      | blank |

  Scenario: Unknown enrollment status is invalid
    Given a "pending" enrollment request
    When the reviewer changes status to "unknown" with reason "omitted"
    Then training responds 400 with error "INVALID_REQUEST"

  Scenario: Missing request status update
    Given a fresh learner
    When the reviewer changes a missing enrollment to approved
    Then training responds 404 with error "ENROLLMENT_REQUEST_NOT_FOUND"

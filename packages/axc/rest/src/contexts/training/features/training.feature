Feature: Training HTTP contracts
  Scenario: Default course search
    Given training application services
    When the client performs "Default course search"
    Then the response is 200 for "Default course search"

  Scenario: Combined course filters
    Given training application services
    When the client performs "Combined course filters"
    Then the response is 200 for "Combined course filters"

  Scenario: Course modality accepts online
    Given training application services
    When the client performs "Course modality accepts online"
    Then the response is 200 for "Course modality accepts online"

  Scenario: Course modality accepts in-person
    Given training application services
    When the client performs "Course modality accepts in-person"
    Then the response is 200 for "Course modality accepts in-person"

  Scenario: Course modality accepts hybrid
    Given training application services
    When the client performs "Course modality accepts hybrid"
    Then the response is 200 for "Course modality accepts hybrid"

  Scenario: Course status accepts draft
    Given training application services
    When the client performs "Course status accepts draft"
    Then the response is 200 for "Course status accepts draft"

  Scenario: Course status accepts active
    Given training application services
    When the client performs "Course status accepts active"
    Then the response is 200 for "Course status accepts active"

  Scenario: Course status accepts retired
    Given training application services
    When the client performs "Course status accepts retired"
    Then the response is 200 for "Course status accepts retired"

  Scenario: Course sort accepts title
    Given training application services
    When the client performs "Course sort accepts title"
    Then the response is 200 for "Course sort accepts title"

  Scenario: Course sort accepts createdAt
    Given training application services
    When the client performs "Course sort accepts createdAt"
    Then the response is 200 for "Course sort accepts createdAt"

  Scenario: Course sort accepts updatedAt
    Given training application services
    When the client performs "Course sort accepts updatedAt"
    Then the response is 200 for "Course sort accepts updatedAt"

  Scenario: Course modality rejects bad
    Given training application services
    When the client performs "Course modality rejects bad"
    Then the response is 400 for field "modality"

  Scenario: Course status rejects pending
    Given training application services
    When the client performs "Course status rejects pending"
    Then the response is 400 for field "status"

  Scenario: Course sort rejects -title
    Given training application services
    When the client performs "Course sort rejects -title"
    Then the response is 400 for field "sort"

  Scenario: Course page rejects 0
    Given training application services
    When the client performs "Course page rejects 0"
    Then the response is 400 for field "page"

  Scenario: Course page rejects -1
    Given training application services
    When the client performs "Course page rejects -1"
    Then the response is 400 for field "page"

  Scenario: Course page rejects 1.5
    Given training application services
    When the client performs "Course page rejects 1.5"
    Then the response is 400 for field "page"

  Scenario: Course page rejects 1e2
    Given training application services
    When the client performs "Course page rejects 1e2"
    Then the response is 400 for field "page"

  Scenario: Course page rejects no
    Given training application services
    When the client performs "Course page rejects no"
    Then the response is 400 for field "page"

  Scenario: Course page rejects 9007199254740992
    Given training application services
    When the client performs "Course page rejects 9007199254740992"
    Then the response is 400 for field "page"

  Scenario: Course pageSize rejects 0
    Given training application services
    When the client performs "Course pageSize rejects 0"
    Then the response is 400 for field "pageSize"

  Scenario: Course pageSize rejects 51
    Given training application services
    When the client performs "Course pageSize rejects 51"
    Then the response is 400 for field "pageSize"

  Scenario: Course pageSize rejects 2.5
    Given training application services
    When the client performs "Course pageSize rejects 2.5"
    Then the response is 400 for field "pageSize"

  Scenario: Course pageSize rejects abc
    Given training application services
    When the client performs "Course pageSize rejects abc"
    Then the response is 400 for field "pageSize"

  Scenario: Blank course options are absent
    Given training application services
    When the client performs "Blank course options are absent"
    Then the response is 200 for "Blank course options are absent"

  Scenario: Page size maximum accepted
    Given training application services
    When the client performs "Page size maximum accepted"
    Then the response is 200 for "Page size maximum accepted"

  Scenario: Creates pending request
    Given training application services
    When the client performs "Creates pending request"
    Then the response is 201 for "Creates pending request"

  Scenario: Invalid email
    Given training application services
    When the client performs "Invalid email"
    Then the response is 400 for field "learnerEmail"

  Scenario: Short justification
    Given training application services
    When the client performs "Short justification"
    Then the response is 400 for field "justification"

  Scenario: Long justification
    Given training application services
    When the client performs "Long justification"
    Then the response is 400 for field "justification"

  Scenario: Missing course id
    Given training application services
    When the client performs "Missing course id"
    Then the response is 400 for field "courseId"

  Scenario: Non-string course id
    Given training application services
    When the client performs "Non-string course id"
    Then the response is 400 for field "courseId"

  Scenario: Null create body
    Given training application services
    When the client performs "Null create body"
    Then the response is 400 for field "body"

  Scenario: Array create body
    Given training application services
    When the client performs "Array create body"
    Then the response is 400 for field "body"

  Scenario: Justification upper boundary accepted
    Given training application services
    When the client performs "Justification upper boundary accepted"
    Then the response is 201 for "Justification upper boundary accepted"

  Scenario: Malformed JSON create
    Given training application services
    When the client performs "Malformed JSON create"
    Then the response is 400 for field "body"

  Scenario: Retrieves enrollment request
    Given training application services
    When the client performs "Retrieves enrollment request"
    Then the response is 200 for "Retrieves enrollment request"

  Scenario: Filters enrollment requests
    Given training application services
    When the client performs "Filters enrollment requests"
    Then the response is 200 for "Filters enrollment requests"

  Scenario: Blank enrollment filters absent
    Given training application services
    When the client performs "Blank enrollment filters absent"
    Then the response is 200 for "Blank enrollment filters absent"

  Scenario: Invalid enrollment status filter
    Given training application services
    When the client performs "Invalid enrollment status filter"
    Then the response is 400 for field "status"

  Scenario: Invalid enrollment email filter
    Given training application services
    When the client performs "Invalid enrollment email filter"
    Then the response is 400 for field "learnerEmail"

  Scenario: List accepts status pending
    Given training application services
    When the client performs "List accepts status pending"
    Then the response is 200 for "List accepts status pending"

  Scenario: List accepts status approved
    Given training application services
    When the client performs "List accepts status approved"
    Then the response is 200 for "List accepts status approved"

  Scenario: List accepts status rejected
    Given training application services
    When the client performs "List accepts status rejected"
    Then the response is 200 for "List accepts status rejected"

  Scenario: List accepts status cancelled
    Given training application services
    When the client performs "List accepts status cancelled"
    Then the response is 200 for "List accepts status cancelled"

  Scenario: Approves enrollment request
    Given training application services
    When the client performs "Approves enrollment request"
    Then the response is 200 for "Approves enrollment request"

  Scenario: Invalid target status
    Given training application services
    When the client performs "Invalid target status"
    Then the response is 400 for field "status"

  Scenario: Missing operator
    Given training application services
    When the client performs "Missing operator"
    Then the response is 400 for field "changedBy"

  Scenario: Blank operator
    Given training application services
    When the client performs "Blank operator"
    Then the response is 400 for field "changedBy"

  Scenario: Missing rejection reason
    Given training application services
    When the client performs "Missing rejection reason"
    Then the response is 400 for field "reason"

  Scenario: Blank rejection reason
    Given training application services
    When the client performs "Blank rejection reason"
    Then the response is 400 for field "reason"

  Scenario: Non-string reason
    Given training application services
    When the client performs "Non-string reason"
    Then the response is 400 for field "reason"

  Scenario: Malformed JSON update
    Given training application services
    When the client performs "Malformed JSON update"
    Then the response is 400 for field "body"

  Scenario: Maps COURSE_NOT_FOUND
    Given training application services
    When the client performs "Maps COURSE_NOT_FOUND"
    Then the response is 404 for "Maps COURSE_NOT_FOUND"

  Scenario: Maps COURSE_NOT_ACTIVE
    Given training application services
    When the client performs "Maps COURSE_NOT_ACTIVE"
    Then the response is 409 for "Maps COURSE_NOT_ACTIVE"

  Scenario: Maps DUPLICATE_ACTIVE_REQUEST
    Given training application services
    When the client performs "Maps DUPLICATE_ACTIVE_REQUEST"
    Then the response is 409 for "Maps DUPLICATE_ACTIVE_REQUEST"

  Scenario: Maps ENROLLMENT_REQUEST_NOT_FOUND
    Given training application services
    When the client performs "Maps ENROLLMENT_REQUEST_NOT_FOUND"
    Then the response is 404 for "Maps ENROLLMENT_REQUEST_NOT_FOUND"

  Scenario: Maps INVALID_STATUS_TRANSITION
    Given training application services
    When the client performs "Maps INVALID_STATUS_TRANSITION"
    Then the response is 409 for "Maps INVALID_STATUS_TRANSITION"

  Scenario: Unexpected errors are sanitized
    Given training application services
    When the client performs "Unexpected errors are sanitized"
    Then the response is 500 for "Unexpected errors are sanitized"


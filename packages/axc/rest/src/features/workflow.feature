Feature: Training workflow HTTP contract
  Scenario: Course defaults
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Course modality online
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Course modality in-person
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Course modality hybrid
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Course status active
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Course status draft
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Course status retired
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Keyword across title summary and tags
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Case insensitive exact tag
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Combined keyword modality status
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Combined tag status and modality
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Literal keyword regex characters
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Literal tag regex characters
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: No matching courses
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Course pagination
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Course page beyond results
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Whitespace optional course fields
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Maximum course page size
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Sort courses by title
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Sort courses by createdAt
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Sort courses by updatedAt
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid course query modality=virtual
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid course query status=invalid
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid course query sort=id
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid course query page=0
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid course query page=-1
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid course query page=1.5
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid course query page=1x
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid course query page=1e2
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid course query page=Infinity
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid course query page=9007199254740999
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid course query page=9007199254740991&pageSize=50
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid course query pageSize=0
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid course query pageSize=51
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid course query pageSize=1.2
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid course query pageSize=abc
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Creates pending enrollment
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Missing enrollment course
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Draft enrollment course
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Retired enrollment course
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid learner email
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Object learner email
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Object course id
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Missing course id
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Empty learner email
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Short justification
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Minimum justification
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Maximum justification
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Long justification
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Nonstring justification
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Malformed JSON
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Array body
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Null body
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: String body
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Duplicate pending
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Duplicate approved
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Reapply after rejected
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Reapply after cancelled
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Learner can request another course
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Retrieves enrollment history
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Missing enrollment retrieval
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: HTTP transition pending to approved
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: HTTP transition pending to rejected
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: HTTP transition pending to cancelled
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: HTTP transition approved to cancelled
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid transition
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Unknown transition status
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Missing transition status
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Object transition status
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Missing rejection reason
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Empty rejection reason
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Nonstring rejection reason
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Blank operator
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Object operator
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Missing status change target
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Lists enrollments by status
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Lists enrollments by course
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Lists enrollments by email
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Lists enrollments by all filters
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Empty enrollment list
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid list status
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Invalid list email
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied
  Scenario: Whitespace optional enrollment filters
    Given the sample application and scenario data
    When the HTTP request is sent
    Then the HTTP contract is satisfied

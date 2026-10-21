Feature: Course search and enrollment requests

  Scenario: A learner creates a pending enrollment request
    When the client creates an enrollment request for "course-001"
    Then the response status is 201
    And the enrollment request is pending for "course-001"

  Scenario: Course search combines keyword, modality, and status
    When the client searches courses with "q=security&modality=online&status=active"
    Then the response status is 200
    And the course search returns the online active security courses

  Scenario: Invalid course search pageSize is rejected
    When the client searches courses with "pageSize=0"
    Then the response status is 400
    And the course search error code is "INVALID_QUERY_PARAMETER"
    And the course search error field is "pageSize"

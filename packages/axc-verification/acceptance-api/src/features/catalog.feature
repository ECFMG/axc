Feature: Course search and enrollment requests

  Scenario: Combined course filters return matching courses
    When the client searches courses with q "security", modality "online", and status "active"
    Then the course search responds with status 200
    And the course search includes "AI Security Foundations"

  Scenario: Invalid course page size is rejected
    When the client searches courses with page size "0"
    Then the course search responds with status 400
    And the course search error code is "INVALID_QUERY_PARAMETER"

  Scenario: A learner creates a pending enrollment request
    When the client creates an enrollment request for course "course-001"
    Then the enrollment response status is 201
    And the enrollment request status is "pending"
    When the client reads that enrollment request
    Then the enrollment response status is 200
    And the enrollment history starts at "pending"

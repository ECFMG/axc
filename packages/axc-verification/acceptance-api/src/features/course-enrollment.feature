Feature: Course search and enrollment requests

  Scenario: A valid enrollment request is created as pending
    When the client creates an enrollment request for course "course-001"
    Then the response status is "201"
    And the enrollment request is pending for course "course-001"

  Scenario: Course search applies keyword, modality, and status together
    When the client searches courses for "security" with modality "online" and status "active"
    Then the response status is "200"
    And the course search returns only online active security courses including "AI Security Foundations"

  Scenario: An invalid course search query is rejected
    When the client searches courses with page size "0"
    Then the response status is "400"
    And the course search error code is "INVALID_QUERY_PARAMETER"

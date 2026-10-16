Feature: Enrollment HTTP contract
  Scenario: Successful enrollment endpoints
    Then creation retrieval filtering and status updates return the documented bodies
  Scenario: Invalid enrollment input
    Then malformed bodies types field boundaries statuses and filters return 400
  Scenario: Domain errors and unexpected failures
    Then errors map to safe consistent status codes and bodies

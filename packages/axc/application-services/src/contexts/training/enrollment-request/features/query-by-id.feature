Feature: Training query-by-id
  Scenario: Retrieves audit history
    Given typed training data sources
    When the existing request is queried
    Then the record includes initial pending history

  Scenario: Reports missing request
    Given typed training data sources
    When a missing request is queried
    Then lookup fails with ENROLLMENT_REQUEST_NOT_FOUND


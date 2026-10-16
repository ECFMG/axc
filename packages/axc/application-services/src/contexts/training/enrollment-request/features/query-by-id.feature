Feature: query-by-id orchestration
  Scenario: Retrieves the saved audit trail
    Given typed training data sources
    When the operation is requested
    Then the result respects the application contract
  Scenario: Reports absent request
    Given typed training data sources
    When the operation is requested
    Then the result respects the application contract

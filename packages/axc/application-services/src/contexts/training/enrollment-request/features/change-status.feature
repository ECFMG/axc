Feature: change-status orchestration
  Scenario: Updates and saves the audit trail
    Given typed training data sources
    When the operation is requested
    Then the result respects the application contract
  Scenario: Rejects absent mutation target
    Given typed training data sources
    When the operation is requested
    Then the result respects the application contract
  Scenario: Leaves state intact on invalid transition
    Given typed training data sources
    When the operation is requested
    Then the result respects the application contract

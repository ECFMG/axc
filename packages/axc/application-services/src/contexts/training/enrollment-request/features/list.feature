Feature: list orchestration
  Scenario: Passes all list criteria to the repository
    Given typed training data sources
    When the operation is requested
    Then the result respects the application contract

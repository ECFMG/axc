Feature: search orchestration
  Scenario: Delegates typed course search
    Given typed training data sources
    When the operation is requested
    Then the result respects the application contract

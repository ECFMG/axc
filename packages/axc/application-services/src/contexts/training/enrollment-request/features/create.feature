Feature: create orchestration
  Scenario: Creates through the transaction
    Given typed training data sources
    When the operation is requested
    Then the result respects the application contract
  Scenario: Rejects missing course
    Given typed training data sources
    When the operation is requested
    Then the result respects the application contract
  Scenario: Rejects draft course
    Given typed training data sources
    When the operation is requested
    Then the result respects the application contract
  Scenario: Rejects retired course
    Given typed training data sources
    When the operation is requested
    Then the result respects the application contract
  Scenario: Propagates duplicate conflict
    Given typed training data sources
    When the operation is requested
    Then the result respects the application contract
  Scenario: Propagates storage failure
    Given typed training data sources
    When the operation is requested
    Then the result respects the application contract

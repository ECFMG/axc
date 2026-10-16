Feature: Training query-courses
  Scenario: Delegates typed course criteria
    Given typed training data sources
    When courses are searched
    Then the read repository receives page 2


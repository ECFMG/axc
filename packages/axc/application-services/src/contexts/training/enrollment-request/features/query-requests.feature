Feature: Training query-requests
  Scenario: Delegates all list filters
    Given typed training data sources
    When pending requests for a learner and course are listed
    Then the read repository receives all 3 filters


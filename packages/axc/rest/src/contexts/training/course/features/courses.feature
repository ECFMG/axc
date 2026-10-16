Feature: Course HTTP contract
  Scenario: Typed search criteria and defaults
    Then valid filters defaults combinations and empty results are mapped
  Scenario: Invalid course queries
    Then invalid enums and pagination values return consistent 400 errors

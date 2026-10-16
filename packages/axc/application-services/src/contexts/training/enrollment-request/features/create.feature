Feature: Training create
  Scenario: Creates within a transaction
    Given typed training data sources
    When an active course is requested
    Then the pending record is saved in one transaction

  Scenario: Rejects missing course
    Given typed training data sources
    When a missing course is requested
    Then creation fails with COURSE_NOT_FOUND

  Scenario: Rejects draft course
    Given typed training data sources
    When a draft course is requested
    Then creation fails with COURSE_NOT_ACTIVE for draft

  Scenario: Rejects retired course
    Given typed training data sources
    When a retired course is requested
    Then creation fails with COURSE_NOT_ACTIVE for retired

  Scenario: Rejects active duplicate
    Given typed training data sources
    When a duplicate is requested
    Then creation fails with DUPLICATE_ACTIVE_REQUEST


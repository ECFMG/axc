Feature: Training update-status
  Scenario: Approves with audit
    Given typed training data sources
    When the pending request is approved
    Then the saved record has 2 history entries

  Scenario: Rejects missing update
    Given typed training data sources
    When a missing request is approved
    Then the update fails with ENROLLMENT_REQUEST_NOT_FOUND

  Scenario: Propagates invalid transition
    Given typed training data sources
    When a pending request is set to pending
    Then the update fails with INVALID_STATUS_TRANSITION

  Scenario: Propagates storage failure
    Given typed training data sources
    When the save fails unexpectedly
    Then the original storage error reaches the caller


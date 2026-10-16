Feature: Transactional enrollment persistence
  Scenario: Creation persists the pending audit entry
    Given an empty enrollment collection
    When a request is created
    Then MongoDB stores 1 pending entry

  Scenario: Concurrent creations enforce unique active learner course
    Given an empty enrollment collection
    When two requests race for the same learner and course
    Then only 1 request commits and the duplicate has a domain error

  Scenario: Approved requests block a second active request
    Given an empty enrollment collection
    When an approved request is followed by another creation
    Then the second request fails with DUPLICATE_ACTIVE_REQUEST

  Scenario: Case variations identify the same learner
    Given an empty enrollment collection
    When a mixed-case learner repeats enrollment
    Then the second active request is a duplicate

  Scenario: Rejected requests allow reapplication
    Given an empty enrollment collection
    When a rejected request is followed by another creation
    Then 2 records exist and only the new one is pending

  Scenario: Cancelled requests allow reapplication
    Given an empty enrollment collection
    When a cancelled request is followed by another creation
    Then 2 records exist with one pending and one cancelled

  Scenario: Combined enrollment filters use MongoDB
    Given an empty enrollment collection
    When requests are filtered by status course and email
    Then only the matching approved learner is returned

  Scenario: Unknown request id returns absence
    Given an empty enrollment collection
    When a malformed request id is queried
    Then the read and write repositories return undefined

  Scenario: Missing valid request id returns absence
    Given an empty enrollment collection
    When an unknown ObjectId is queried
    Then no request is returned for the valid id

  Scenario: History survives approval and cancellation
    Given an empty enrollment collection
    When approval is followed by cancellation
    Then 3 ordered immutable audit entries are persisted

  Scenario: Transaction rollback preserves audit
    Given an empty enrollment collection
    When a saved approval transaction is aborted
    Then the stored request stays pending with 1 history entry


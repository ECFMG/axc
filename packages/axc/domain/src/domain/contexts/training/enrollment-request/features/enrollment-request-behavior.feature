Feature: Enrollment aggregate status and audit
  Scenario: Aggregate pending to pending
    Given an enrollment aggregate with status "pending"
    When the aggregate changes to "pending"
    Then the transition fails with 409 semantics and status stays "pending"

  Scenario: Aggregate pending to approved
    Given an enrollment aggregate with status "pending"
    When the aggregate changes to "approved"
    Then the status is "approved" with 2 history entries

  Scenario: Aggregate pending to rejected
    Given an enrollment aggregate with status "pending"
    When the aggregate changes to "rejected"
    Then the status is "rejected" with 2 history entries

  Scenario: Aggregate pending to cancelled
    Given an enrollment aggregate with status "pending"
    When the aggregate changes to "cancelled"
    Then the status is "cancelled" with 2 history entries

  Scenario: Aggregate approved to pending
    Given an enrollment aggregate with status "approved"
    When the aggregate changes to "pending"
    Then the transition fails with 409 semantics and status stays "approved"

  Scenario: Aggregate approved to approved
    Given an enrollment aggregate with status "approved"
    When the aggregate changes to "approved"
    Then the transition fails with 409 semantics and status stays "approved"

  Scenario: Aggregate approved to rejected
    Given an enrollment aggregate with status "approved"
    When the aggregate changes to "rejected"
    Then the transition fails with 409 semantics and status stays "approved"

  Scenario: Aggregate approved to cancelled
    Given an enrollment aggregate with status "approved"
    When the aggregate changes to "cancelled"
    Then the status is "cancelled" with 2 history entries

  Scenario: Aggregate rejected to pending
    Given an enrollment aggregate with status "rejected"
    When the aggregate changes to "pending"
    Then the transition fails with 409 semantics and status stays "rejected"

  Scenario: Aggregate rejected to approved
    Given an enrollment aggregate with status "rejected"
    When the aggregate changes to "approved"
    Then the transition fails with 409 semantics and status stays "rejected"

  Scenario: Aggregate rejected to rejected
    Given an enrollment aggregate with status "rejected"
    When the aggregate changes to "rejected"
    Then the transition fails with 409 semantics and status stays "rejected"

  Scenario: Aggregate rejected to cancelled
    Given an enrollment aggregate with status "rejected"
    When the aggregate changes to "cancelled"
    Then the transition fails with 409 semantics and status stays "rejected"

  Scenario: Aggregate cancelled to pending
    Given an enrollment aggregate with status "cancelled"
    When the aggregate changes to "pending"
    Then the transition fails with 409 semantics and status stays "cancelled"

  Scenario: Aggregate cancelled to approved
    Given an enrollment aggregate with status "cancelled"
    When the aggregate changes to "approved"
    Then the transition fails with 409 semantics and status stays "cancelled"

  Scenario: Aggregate cancelled to rejected
    Given an enrollment aggregate with status "cancelled"
    When the aggregate changes to "rejected"
    Then the transition fails with 409 semantics and status stays "cancelled"

  Scenario: Aggregate cancelled to cancelled
    Given an enrollment aggregate with status "cancelled"
    When the aggregate changes to "cancelled"
    Then the transition fails with 409 semantics and status stays "cancelled"


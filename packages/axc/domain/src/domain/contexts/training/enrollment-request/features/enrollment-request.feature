Feature: Enrollment domain rules
  Scenario: Transition pending to pending
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Transition pending to approved
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Transition pending to rejected
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Transition pending to cancelled
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Transition approved to pending
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Transition approved to approved
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Transition approved to rejected
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Transition approved to cancelled
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Transition rejected to pending
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Transition rejected to approved
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Transition rejected to rejected
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Transition rejected to cancelled
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Transition cancelled to pending
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Transition cancelled to approved
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Transition cancelled to rejected
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Transition cancelled to cancelled
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Rejects invalid email
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Rejects short justification
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Accepts minimum justification
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Accepts maximum justification
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Rejects long justification
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Rejects blank rejection reason
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Rejects blank operator
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Rejects consecutive local dots
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Rejects invalid domain labels
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Rejects consecutive domain dots
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced
  Scenario: Accepts plus email aliases
    Given an enrollment aggregate
    When the domain operation is performed
    Then the rule is enforced

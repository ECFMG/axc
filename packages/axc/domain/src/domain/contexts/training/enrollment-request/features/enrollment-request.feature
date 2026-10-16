Feature: Enrollment request invariants
  Scenario: Justification length 19
    Given enrollment request rules
    When justification has 19 characters
    Then validation returns 1 justification errors

  Scenario: Justification length 20
    Given enrollment request rules
    When justification has 20 characters
    Then validation returns 0 justification errors

  Scenario: Justification length 500
    Given enrollment request rules
    When justification has 500 characters
    Then validation returns 0 justification errors

  Scenario: Justification length 501
    Given enrollment request rules
    When justification has 501 characters
    Then validation returns 1 justification errors

  Scenario: Email learner@example.org
    Given enrollment request rules
    When email is "learner@example.org"
    Then validation returns 0 email errors

  Scenario: Email bad
    Given enrollment request rules
    When email is "bad"
    Then validation returns 1 email errors

  Scenario: Email empty
    Given enrollment request rules
    When email is ""
    Then validation returns 1 email errors

  Scenario: Email a@@b.org
    Given enrollment request rules
    When email is "a@@b.org"
    Then validation returns 1 email errors

  Scenario: Email a b@example.org
    Given enrollment request rules
    When email is "a b@example.org"
    Then validation returns 1 email errors

  Scenario: Transition pending to pending
    Given enrollment request rules
    When "pending" changes to "pending"
    Then transition is "False"

  Scenario: Transition pending to approved
    Given enrollment request rules
    When "pending" changes to "approved"
    Then transition is "True"

  Scenario: Transition pending to rejected
    Given enrollment request rules
    When "pending" changes to "rejected"
    Then transition is "True"

  Scenario: Transition pending to cancelled
    Given enrollment request rules
    When "pending" changes to "cancelled"
    Then transition is "True"

  Scenario: Transition approved to pending
    Given enrollment request rules
    When "approved" changes to "pending"
    Then transition is "False"

  Scenario: Transition approved to approved
    Given enrollment request rules
    When "approved" changes to "approved"
    Then transition is "False"

  Scenario: Transition approved to rejected
    Given enrollment request rules
    When "approved" changes to "rejected"
    Then transition is "False"

  Scenario: Transition approved to cancelled
    Given enrollment request rules
    When "approved" changes to "cancelled"
    Then transition is "True"

  Scenario: Transition rejected to pending
    Given enrollment request rules
    When "rejected" changes to "pending"
    Then transition is "False"

  Scenario: Transition rejected to approved
    Given enrollment request rules
    When "rejected" changes to "approved"
    Then transition is "False"

  Scenario: Transition rejected to rejected
    Given enrollment request rules
    When "rejected" changes to "rejected"
    Then transition is "False"

  Scenario: Transition rejected to cancelled
    Given enrollment request rules
    When "rejected" changes to "cancelled"
    Then transition is "False"

  Scenario: Transition cancelled to pending
    Given enrollment request rules
    When "cancelled" changes to "pending"
    Then transition is "False"

  Scenario: Transition cancelled to approved
    Given enrollment request rules
    When "cancelled" changes to "approved"
    Then transition is "False"

  Scenario: Transition cancelled to rejected
    Given enrollment request rules
    When "cancelled" changes to "rejected"
    Then transition is "False"

  Scenario: Transition cancelled to cancelled
    Given enrollment request rules
    When "cancelled" changes to "cancelled"
    Then transition is "False"

  Scenario: Rejection reason None
    Given enrollment request rules
    When rejection reason is "None"
    Then validation returns 1 reason errors

  Scenario: Rejection reason ''
    Given enrollment request rules
    When rejection reason is ""
    Then validation returns 1 reason errors

  Scenario: Rejection reason '   '
    Given enrollment request rules
    When rejection reason is "   "
    Then validation returns 1 reason errors

  Scenario: Rejection reason 'Prerequisite missing'
    Given enrollment request rules
    When rejection reason is "Prerequisite missing"
    Then validation returns 0 reason errors


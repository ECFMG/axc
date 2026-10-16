Feature: Email format validation
  Scenario: Leading local dot
    Given email ".learner@example.org"
    When the email format is validated
    Then learnerEmail has 1 validation error

  Scenario: Consecutive local dots
    Given email "learner..name@example.org"
    When the email format is validated
    Then learnerEmail has 1 validation error

  Scenario: Leading domain hyphen
    Given email "learner@-example.org"
    When the email format is validated
    Then learnerEmail has 1 validation error

  Scenario: Trailing domain hyphen
    Given email "learner@example-.org"
    When the email format is validated
    Then learnerEmail has 1 validation error

  Scenario: Invalid domain characters
    Given email "learner@exam!ple.org"
    When the email format is validated
    Then learnerEmail has 1 validation error


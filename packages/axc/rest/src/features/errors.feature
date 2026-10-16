Feature: Unexpected HTTP failures
  Scenario: Internal errors are sanitized and logged
    Given a failed service dependency
    When the catalog is requested
    Then a safe internal error is returned and logged

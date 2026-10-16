Feature: Course storage failure response
  Scenario: Hides internal errors from clients
    Given a failing catalog service
    When the catalog request fails
    Then the client receives a safe server error

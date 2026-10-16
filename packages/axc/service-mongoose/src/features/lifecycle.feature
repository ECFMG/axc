Feature: MongoDB infrastructure lifecycle
  Scenario: Local startup runs the initializer
    Given an unstarted MongoDB service
    When the local service starts
    Then a connected service is initialized and can shut down

  Scenario: A configured URI does not seed
    Given a configured local test database
    When the configured service starts
    Then the local initializer is not called

  Scenario: An initializer failure closes local storage
    Given an initializer that rejects
    When the local initialization fails
    Then the error propagates and the service is unavailable

  Scenario: Unstarted service access is explicit
    Given an unstarted MongoDB service
    When the connection is requested before startup
    Then the service reports that it is not started

  Scenario: Duplicate startup is rejected
    Given a started MongoDB service
    When startup is requested again
    Then the original connection remains available

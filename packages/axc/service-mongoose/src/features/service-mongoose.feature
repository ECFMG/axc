Feature: Local catalog storage lifecycle
  Scenario: Local MongoDB starts and stops
    When local storage is started without a configured URI
    Then a connected MongoDB service is available and can shut down

  Scenario: Unstarted service has no connection
    When the connection is accessed before startup
    Then access fails explicitly

  Scenario: Configured MongoDB connection
    When storage starts with a configured MongoDB URI
    Then the configured database is connected without starting another memory server

  Scenario: Failed connection is explicit
    When storage starts with an invalid MongoDB URI
    Then startup rejects and no service is exposed

Feature: Managed local MongoDB
  Scenario: Start and stop local storage
    Then an unconfigured service starts MongoDB 7.0.14 and releases it on shutdown
  Scenario: Connect to configured storage
    Then a configured service connects without starting another memory server
  Scenario: Failed startup releases local resources
    Then a connection failure stops the memory server and leaves the service unavailable

Feature: Infrastructure context initialization
 Scenario: Pending infrastructure context
  Then requests await a successfully initialized context
 Scenario: Failed infrastructure context
  Then initialization rejection is handled before requests and propagated to requests

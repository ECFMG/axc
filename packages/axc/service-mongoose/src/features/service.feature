Feature: Local MongoDB lifecycle
  Scenario: Pins the local MongoDB version
    Given a local MongoDB server factory
    When a server is created
    Then it requests MongoDB 7.0.14

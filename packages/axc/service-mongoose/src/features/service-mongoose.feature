Feature: Local sample database
  Scenario: MongoDB binary is reproducible
    Given a local MongoDB factory
    When a local server is configured
    Then MongoDB version "7.0.14" is selected

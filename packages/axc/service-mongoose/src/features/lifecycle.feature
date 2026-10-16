Feature: Training storage lifecycle
  Scenario: Configured storage starts before initialization
    Given a configured mongoose service
    When storage startup succeeds
    Then initialization runs after connection
  Scenario: Failed initialization cleans up the connection
    Given a configured mongoose service
    When storage initialization fails
    Then startup reports failure and disconnects

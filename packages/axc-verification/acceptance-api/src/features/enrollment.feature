Feature: Course catalog search

  Scenario: A-AC1 course search contract
    When the live catalog API proves "A-AC1"

  Scenario: A-AC2 course search contract
    When the live catalog API proves "A-AC2"

  Scenario: A-AC3 course search contract
    When the live catalog API proves "A-AC3"

  Scenario: A-AC4 course search contract
    When the live catalog API proves "A-AC4"

  Scenario: A-AC5 course search contract
    When the live catalog API proves "A-AC5"

  Scenario: A-AC6 course search contract
    When the live catalog API proves "A-AC6"

  Scenario: A-AC7 course search contract
    When the live catalog API proves "A-AC7"

  Scenario: A-AC8 course search contract
    When the live catalog API proves "A-AC8"

  Scenario: A-AC9 course search contract
    When the live catalog API proves "A-AC9"

  Scenario: B-AC1 preserve course search
    When the live catalog API proves "B-AC1"

  Scenario: B-AC2 enrollment contract
    When the live enrollment API proves "B-AC2"

  Scenario: B-AC3 enrollment contract
    When the live enrollment API proves "B-AC3"

  Scenario: B-AC4 enrollment contract
    When the live enrollment API proves "B-AC4"

  Scenario: B-AC5 enrollment contract
    When the live enrollment API proves "B-AC5"

  Scenario: B-AC6 enrollment contract
    When the live enrollment API proves "B-AC6"

  Scenario: B-AC7 enrollment contract
    When the live enrollment API proves "B-AC7"

  Scenario: B-AC8 enrollment contract
    When the live enrollment API proves "B-AC8"

  Scenario: B-AC9 enrollment contract
    When the live enrollment API proves "B-AC9"

  Scenario: B-AC10 enrollment contract
    When the live enrollment API proves "B-AC10"

  Scenario: B-AC11 enrollment contract
    When the live enrollment API proves "B-AC11"

  Scenario: B-AC12 enrollment contract
    When the live enrollment API proves "B-AC12"

  Scenario: B-AC13 A-AC10 existing healthcheck remains available
    When the client requests the healthcheck
    Then the healthcheck responds with status 200
    And the healthcheck body matches the agentCourses contract

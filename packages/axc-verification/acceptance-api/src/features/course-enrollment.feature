Feature: Course search and enrollment requests
  Scenario: B-AC1 course search from Task Set A
    When the client verifies the course search contract

  Scenario: B-AC2 valid creation starts pending
    When the client verifies enrollment creation and history

  Scenario: B-AC3 missing course returns 404
    When the client verifies enrollment input errors

  Scenario: B-AC4 draft and retired courses return 409
    When the client verifies enrollment input errors

  Scenario: B-AC5 invalid email and justification return 400
    When the client verifies enrollment input errors

  Scenario: B-AC6 duplicate pending and approved requests return 409
    When the client verifies enrollment duplicate prevention

  Scenario: B-AC7 retrieve a request including history
    When the client verifies enrollment creation and history

  Scenario: B-AC8 enrollment filters
    When the client verifies enrollment filtering

  Scenario: B-AC9 valid status transitions
    When the client verifies enrollment transitions

  Scenario: B-AC10 invalid transitions leave state unchanged
    When the client verifies enrollment transitions

  Scenario: B-AC11 rejection requires a reason
    When the client verifies enrollment input errors

  Scenario: B-AC12 creation and every transition append history
    When the client verifies enrollment creation and history

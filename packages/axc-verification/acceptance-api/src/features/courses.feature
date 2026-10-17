Feature: Course catalog search

  Scenario: A-AC1 Default catalog pagination
    When the catalog client requests ""
    Then the catalog status is 200
    And the catalog contains 10 items with page 1 size 10 total 12 pages 2
    And the catalog ids are "course-001,course-004,course-002,course-005,course-003,course-006,course-007,course-008,course-009,course-010"

  Scenario: A-AC2 Keyword matches title summary and tags case insensitively
    When the catalog client requests "?q=SeCuRiTy"
    Then the catalog status is 200
    And the catalog ids are "course-001,course-002,course-003"

  Scenario: A-AC3 Modality filter
    When the catalog client requests "?modality=online"
    Then the catalog status is 200
    And the catalog ids are "course-001,course-004,course-002,course-007,course-011"

  Scenario: A-AC4 Status filter
    When the catalog client requests "?status=active"
    Then the catalog status is 200
    And the catalog ids are "course-001,course-002,course-005,course-006,course-007,course-009,course-012"

  Scenario: A-AC5 Tag filter case insensitively
    When the catalog client requests "?tag=AI"
    Then the catalog status is 200
    And the catalog ids are "course-001,course-004,course-012"

  Scenario: A-AC6 Explicit pagination
    When the catalog client requests "?page=2&pageSize=5"
    Then the catalog status is 200
    And the catalog contains 5 items with page 2 size 5 total 12 pages 3
    And the catalog ids are "course-006,course-007,course-008,course-009,course-010"

  Scenario: A-AC7 Creation time sort
    When the catalog client requests "?sort=createdAt&pageSize=50"
    Then the catalog status is 200
    And the catalog ids are "course-001,course-002,course-003,course-004,course-005,course-006,course-007,course-008,course-009,course-010,course-011,course-012"

  Scenario Outline: A-AC8 Consistent invalid query error
    When the catalog client requests "?<query>"
    Then the catalog status is 400
    And the catalog error identifies "<field>"
    Examples:
      | query          | field    |
      | modality=other | modality |
      | status=other   | status   |
      | page=0         | page     |
      | pageSize=51    | pageSize |
      | sort=id        | sort     |

  Scenario: A-AC9 Empty search succeeds
    When the catalog client requests "?q=nonexistent"
    Then the catalog status is 200
    And the catalog contains 0 items with page 1 size 10 total 0 pages 0

  Scenario: A-AC10 Existing health contract still works
    When the client requests the healthcheck
    Then the healthcheck responds with status 200
    And the healthcheck body matches the agentCourses contract

  Scenario Outline: A-AC11 Combined filters
    When the catalog client requests "?<query>"
    Then the catalog status is 200
    And the catalog ids are "<ids>"
    Examples:
      | query                                         | ids                   |
      | q=security&modality=online&status=active        | course-001,course-002 |
      | tag=AI&modality=hybrid&status=active            | course-012            |

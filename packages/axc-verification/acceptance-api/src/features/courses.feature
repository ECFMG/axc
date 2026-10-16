Feature: Course catalog search

  Scenario Outline: Search returns the expected courses and pagination
    When the client searches courses with "<query>"
    Then the courses response has status 200
    And the course ids are "<ids>"
    And course pagination is <page>, <pageSize>, <totalItems>, <totalPages>

    Examples:
      | query                                        | ids                                                                                                           | page | pageSize | totalItems | totalPages |
      |                                              | course-001,course-002,course-003,course-004,course-005,course-006,course-007,course-008,course-009,course-010 | 1 | 10 | 12 | 2 |
      | q=sEcUrItY                                   | course-001,course-006,course-008 | 1 | 10 | 3 | 1 |
      | modality=online                              | course-001,course-003,course-005,course-009 | 1 | 10 | 4 | 1 |
      | status=active                                | course-001,course-002,course-004,course-005,course-007,course-011 | 1 | 10 | 6 | 1 |
      | tag=ai                                       | course-001,course-007 | 1 | 10 | 2 | 1 |
      | q=security&modality=online&status=active       | course-001 | 1 | 10 | 1 | 1 |
      | tag=AI&status=active&modality=hybrid           | course-007 | 1 | 10 | 1 | 1 |
      | page=1&pageSize=5                            | course-001,course-002,course-003,course-004,course-005 | 1 | 5 | 12 | 3 |
      | page=3&pageSize=5                            | course-011,course-012 | 3 | 5 | 12 | 3 |
      | sort=createdAt&pageSize=50                   | course-001,course-002,course-003,course-004,course-005,course-006,course-007,course-008,course-009,course-010,course-011,course-012 | 1 | 50 | 12 | 1 |
      | sort=updatedAt&pageSize=50                   | course-012,course-011,course-010,course-009,course-008,course-007,course-006,course-005,course-004,course-003,course-002,course-001 | 1 | 50 | 12 | 1 |
      | q=unmatched                                 | | 1 | 10 | 0 | 0 |
      | page=99                                     | | 99 | 10 | 12 | 2 |

  Scenario Outline: Invalid query parameters have a consistent error response
    When the client searches courses with "<query>"
    Then the courses response has status 400
    And the invalid course query identifies "<field>"

    Examples:
      | query | field |
      | modality=remote | modality |
      | status=unknown | status |
      | page=0 | page |
      | page=1.5 | page |
      | pageSize=51 | pageSize |
      | pageSize=0 | pageSize |
      | sort=unknown | sort |

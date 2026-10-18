Feature: Course catalog search

  Scenario: A-AC1 default pagination
    When the client requests courses with query ""
    Then the courses response has status 200
    And the courses metadata is page 1 size 10 total 12 pages 2
    And the course ids are "course-001,course-004,course-005,course-002,course-006,course-003,course-007,course-008,course-009,course-010"

  Scenario Outline: <criterion> search and filters
    When the client requests courses with query "<query>"
    Then the courses response has status 200
    And the course ids are "<ids>"
    Examples:
      | criterion | query | ids |
      | A-AC2 | ?q=SeCuRiTy | course-001,course-002,course-003,course-012 |
      | A-AC3 | ?modality=online | course-001,course-005,course-002,course-008,course-011 |
      | A-AC4 | ?status=active | course-001,course-004,course-002,course-006,course-008,course-009,course-012 |
      | A-AC5 | ?tag=AI | course-001,course-008,course-012 |
      | A-AC11 combined keyword | ?q=security&modality=online&status=active | course-001,course-002 |
      | A-AC11 combined tag | ?tag=ai&modality=in-person&status=active | course-012 |
      | A-AC9 | ?q=nonexistent | |

  Scenario: A-AC6 pagination
    When the client requests courses with query "?page=1&pageSize=5"
    Then the courses response has status 200
    And the courses metadata is page 1 size 5 total 12 pages 3
    And the course ids are "course-001,course-004,course-005,course-002,course-006"

  Scenario: A-AC7 ascending creation date
    When the client requests courses with query "?sort=createdAt&pageSize=50"
    Then the courses response has status 200
    And the course ids are "course-012,course-011,course-010,course-009,course-008,course-007,course-006,course-005,course-004,course-003,course-002,course-001"

  Scenario Outline: A-AC8 invalid query parameters
    When the client requests courses with query "?<query>"
    Then the courses response has status 400
    And the courses error identifies "<field>"
    Examples:
      | query | field |
      | modality=remote | modality |
      | status=published | status |
      | page=0 | page |
      | pageSize=51 | pageSize |
      | sort=id | sort |

Feature: Course catalog search
  Scenario: Default course list
    When the client requests courses with query ""
    Then the course response status is 200
    And the course page is 1 with size 10 and total 12
    And the course items are sorted by "title"
    And every course has the catalog fields

  Scenario: Keyword matches title, summary and tags regardless of case
    When the client requests courses with query "q=SeCuRiTy"
    Then the course response status is 200
    And the matching course ids are "course-001,course-003,course-008"

  Scenario Outline: Single filters
    When the client requests courses with query "<query>"
    Then the course response status is 200
    And the matching course ids are "<ids>"
    Examples:
      | query              | ids                                                    |
      | modality=online    | course-001,course-004,course-007,course-010               |
      | status=active      | course-001,course-002,course-004,course-007,course-008,course-009,course-012 |
      | tag=AI             | course-001,course-005,course-010                          |
      | q=security&modality=online&status=active | course-001                              |
      | tag=cloud&modality=hybrid&status=retired | course-011                               |

  Scenario: First page with explicit page size
    When the client requests courses with query "page=1&pageSize=5"
    Then the course response status is 200
    And the course page is 1 with size 5 and total 12
    And the matching course ids are "course-001,course-009,course-007,course-002,course-004"

  Scenario: Pagination
    When the client requests courses with query "page=2&pageSize=5"
    Then the course response status is 200
    And the course page is 2 with size 5 and total 12
    And the matching course ids are "course-003,course-008,course-011,course-006,course-010"

  Scenario Outline: Sorting
    When the client requests courses with query "sort=<sort>&pageSize=50"
    Then the course response status is 200
    And the course items are sorted by "<sort>"
    Examples:
      | sort      |
      | title     |
      | createdAt |
      | updatedAt |

  Scenario Outline: Invalid queries
    When the client requests courses with query "<query>"
    Then the course response status is 400
    And the course validation error names "<field>"
    Examples:
      | query              | field    |
      | modality=remote    | modality |
      | status=unknown     | status   |
      | page=0             | page     |
      | page=1e2           | page     |
      | pageSize=51        | pageSize |
      | pageSize=0         | pageSize |
      | sort=id            | sort     |
      | unknown=x          | unknown  |
      | tag=ai&tag=data     | tag      |

  Scenario: No matches
    When the client requests courses with query "q=not-a-course"
    Then the course response status is 200
    And the course page is 1 with size 10 and total 0
    And the matching course ids are ""

  Scenario: Optional blank values use defaults
    When the client requests courses with query "q=+&modality=&page=+&pageSize=&sort=+"
    Then the course response status is 200
    And the course page is 1 with size 10 and total 12

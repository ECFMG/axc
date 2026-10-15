Feature: Course catalog search

  Scenario: Default list and complete course contract
    When the client searches courses with ""
    Then the course response status is 200
    And the course page has page 1, page size 10, total items 12, and total pages 2
    And the course ids are "course-001,course-002,course-003,course-004,course-005,course-006,course-007,course-008,course-009,course-010"
    And every course has the catalog fields

  Scenario Outline: Keyword search across title, summary and tags regardless of case
    When the client searches courses with "q=<keyword>"
    Then the course response status is 200
    And the course ids are "<ids>"
    Examples:
      | keyword   | ids                              |
      | SeCuRiTy  | course-001,course-002,course-011   |
      | AUTONOMOUS| course-002                       |

  Scenario Outline: Filter courses
    When the client searches courses with "<query>"
    Then the course response status is 200
    And the course ids are "<ids>"
    Examples:
      | query                                          | ids                                         |
      | modality=online                                | course-001,course-002,course-006,course-009   |
      | status=active                                  | course-001,course-002,course-003,course-006,course-007,course-008 |
      | tag=AI                                         | course-001,course-002,course-007,course-012   |
      | q=SECURITY&modality=online&status=active         | course-001,course-002                         |
      | tag=ai&modality=hybrid                          | course-007                                    |

  Scenario: Custom first page
    When the client searches courses with "page=1&pageSize=5"
    Then the course response status is 200
    And the course page has page 1, page size 5, total items 12, and total pages 3
    And the course ids are "course-001,course-002,course-003,course-004,course-005"

  Scenario: Final partial page
    When the client searches courses with "page=3&pageSize=5"
    Then the course response status is 200
    And the course page has page 3, page size 5, total items 12, and total pages 3
    And the course ids are "course-011,course-012"

  Scenario Outline: Ascending sort order
    When the client searches courses with "sort=<sort>&pageSize=50"
    Then the course response status is 200
    And courses are ascending by "<sort>"
    Examples:
      | sort      |
      | title     |
      | createdAt |
      | updatedAt |

  Scenario Outline: Invalid parameters
    When the client searches courses with "<query>"
    Then the course response status is 400
    And the course query error identifies "<field>"
    Examples:
      | query            | field    |
      | modality=remote  | modality |
      | status=unknown   | status   |
      | page=0           | page     |
      | page=-1          | page     |
      | page=1.5         | page     |
      | page=1e2         | page     |
      | pageSize=0       | pageSize |
      | pageSize=51      | pageSize |
      | sort=unknown     | sort     |

  Scenario: No matching courses
    When the client searches courses with "q=no-such-course"
    Then the course response status is 200
    And the course ids are ""
    And the course page has page 1, page size 10, total items 0, and total pages 0

  Scenario: Page past the end
    When the client searches courses with "page=99"
    Then the course response status is 200
    And the course ids are ""
    And the course page has page 99, page size 10, total items 12, and total pages 2

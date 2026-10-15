Feature: Course catalog search

  Scenario: Default list (A1, A7, A8, A-AC1)
    When the client requests courses with query ""
    Then the courses response status is 200
    And course pagination is page 1 size 10 total 12 pages 2
    And the courses contain 10 items
    And courses are sorted by "title"

  Scenario: Keyword matches title, summary, and tags regardless of case (A3, A-AC2)
    When the client requests courses with query "q=SeCuRiTy"
    Then the courses response status is 200
    And the course ids are "course-001,course-003,course-009,course-012"

  Scenario Outline: Each modality (A4, A-AC3)
    When the client requests courses with query "modality=<modality>"
    Then the courses response status is 200
    And every course has modality "<modality>"
    Examples:
      | modality  |
      | online    |
      | in-person |
      | hybrid    |

  Scenario Outline: Each status (A5, A-AC4)
    When the client requests courses with query "status=<status>"
    Then the courses response status is 200
    And every course has status "<status>"
    Examples:
      | status  |
      | draft   |
      | active  |
      | retired |

  Scenario: Exact case insensitive tag (A6, A-AC5)
    When the client requests courses with query "tag=AI"
    Then the courses response status is 200
    And the course ids are "course-001,course-004,course-006"

  Scenario: Combined keyword modality and status (A2, A-AC11)
    When the client requests courses with query "q=security&modality=online&status=active"
    Then the courses response status is 200
    And the course ids are "course-001"

  Scenario: Combined tag and status (A2, A-AC11)
    When the client requests courses with query "tag=ai&status=active"
    Then the courses response status is 200
    And the course ids are "course-001,course-006"

  Scenario: Pagination (A7, A-AC6)
    When the client requests courses with query "page=1&pageSize=5"
    Then the courses response status is 200
    And course pagination is page 1 size 5 total 12 pages 3
    And the courses contain 5 items

  Scenario: Final partial page
    When the client requests courses with query "page=3&pageSize=5"
    Then the courses response status is 200
    And course pagination is page 3 size 5 total 12 pages 3
    And the courses contain 2 items

  Scenario Outline: Sorting (A8, A-AC7)
    When the client requests courses with query "sort=<sort>&pageSize=50"
    Then the courses response status is 200
    And the courses contain 12 items
    And courses are sorted by "<sort>"
    Examples:
      | sort      |
      | title     |
      | createdAt |
      | updatedAt |

  Scenario Outline: Invalid queries (A9, A-AC8)
    When the client requests courses with query "<query>"
    Then the courses response status is 400
    And the courses error identifies "<field>"
    Examples:
      | query              | field    |
      | modality=remote    | modality |
      | status=archived    | status   |
      | page=0             | page     |
      | page=1e2           | page     |
      | pageSize=0         | pageSize |
      | pageSize=51        | pageSize |
      | sort=unknown       | sort     |
      | page=1&page=2      | page     |
      | unknown=value      | unknown  |

  Scenario: No matches (A-AC9)
    When the client requests courses with query "q=not-a-matching-course"
    Then the courses response status is 200
    And course pagination is page 1 size 10 total 0 pages 0
    And the courses contain 0 items

  Scenario: Page beyond available results
    When the client requests courses with query "page=99"
    Then the courses response status is 200
    And course pagination is page 99 size 10 total 12 pages 2
    And the courses contain 0 items

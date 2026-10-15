Feature: Course catalog search

  Scenario: Defaults expose a complete fixture catalog
    When the client requests courses ""
    Then the courses response has status 200
    And the catalog uses default pagination and valid course records

  Scenario Outline: Search and filters select exact courses
    When the client requests courses "<query>"
    Then the courses response has status 200
    And the matching course ids are "<ids>"

    Examples:
      | query                                         | ids                                         |
      | ?q=sEcUrItY                                   | course-001,course-002,course-010,course-003   |
      | ?modality=online                              | course-011,course-004,course-001,course-008,course-005 |
      | ?status=active                                | course-004,course-001,course-002,course-010,course-008,course-009,course-005 |
      | ?tag=AI                                       | course-011,course-004,course-001             |
      | ?q=security&modality=online&status=active       | course-001                                  |
      | ?status=draft&tag=ai                           | course-011                                  |
      | ?q=does-not-exist                              |                                             |

  Scenario: First page supports an explicit size
    When the client requests courses "?page=1&pageSize=5"
    Then the courses response has status 200
    And the catalog page is 1 with size 5 and 12 total items and 3 total pages
    And the matching course ids are "course-011,course-004,course-001,course-002,course-010"

  Scenario: Pagination preserves totals
    When the client requests courses "?page=2&pageSize=5"
    Then the courses response has status 200
    And the catalog page is 2 with size 5 and 12 total items and 3 total pages
    And the matching course ids are "course-006,course-007,course-008,course-009,course-003"

  Scenario Outline: Sort fields order the full catalog
    When the client requests courses "?sort=<sort>&pageSize=50"
    Then the courses response has status 200
    And the catalog is sorted by "<sort>"

    Examples:
      | sort      |
      | title     |
      | createdAt |
      | updatedAt |

  Scenario: No matches preserve pagination metadata
    When the client requests courses "?q=does-not-exist"
    Then the courses response has status 200
    And the catalog page is 1 with size 10 and 0 total items and 0 total pages
    And the matching course ids are ""

  Scenario Outline: Invalid queries return the error contract
    When the client requests courses "?<query>"
    Then the courses response has status 400
    And the catalog error identifies "<field>"

    Examples:
      | query             | field    |
      | modality=remote   | modality |
      | status=published  | status   |
      | page=0            | page     |
      | page=1.5          | page     |
      | pageSize=51       | pageSize |
      | pageSize=0        | pageSize |
      | sort=invalid      | sort     |
      | q=                | q        |
      | tag=              | tag      |
      | unknown=x         | unknown  |
      | page=1&page=2     | page     |

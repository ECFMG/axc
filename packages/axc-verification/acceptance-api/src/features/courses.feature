Feature: Course catalog search

  Scenario: the default list is paginated and sorted by title
    When the client requests the course catalog
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 10
    And the course catalog total items is 12
    And the course catalog total pages is 2
    And the course catalog returns 10 courses
    And the course ids are "course-002,course-001,course-003,course-004,course-005,course-006,course-007,course-008,course-009,course-010"

  Scenario: keyword search is case-insensitive across title, summary, and tags
    When the client requests the course catalog with "q=SeCuRiTy&pageSize=50"
    Then the course catalog responds with status 200
    And the course catalog total items is 4
    And the course ids are "course-001,course-004,course-008,course-012"

  Scenario: modality filter returns only online courses
    When the client requests the course catalog with "modality=online&pageSize=50"
    Then the course catalog responds with status 200
    And the course catalog total items is 4
    And every course modality is "online"

  Scenario: status filter returns only active courses
    When the client requests the course catalog with "status=active&pageSize=50"
    Then the course catalog responds with status 200
    And the course catalog total items is 6
    And every course status is "active"

  Scenario: tag filter matches tags regardless of case
    When the client requests the course catalog with "tag=AI&pageSize=50"
    Then the course catalog responds with status 200
    And the course catalog total items is 3
    And the course ids are "course-001,course-010,course-011"

  Scenario: keyword, modality, and status filters combine
    When the client requests the course catalog with "q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 5
    And the course catalog total items is 1
    And the course catalog total pages is 1
    And the course ids are "course-001"
    And course "course-001" is titled "AI Security Foundations"

  Scenario: page and page size limit the page
    When the client requests the course catalog with "page=1&pageSize=5"
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 5
    And the course catalog total items is 12
    And the course catalog total pages is 3
    And the course catalog returns 5 courses

  Scenario: createdAt sort orders the catalog by creation time
    When the client requests the course catalog with "sort=createdAt&pageSize=50"
    Then the course catalog responds with status 200
    And the course ids are "course-001,course-005,course-002,course-008,course-003,course-011,course-004,course-006,course-007,course-009,course-010,course-012"

  Scenario Outline: invalid query parameters return 400
    When the client requests the course catalog with "<query>"
    Then the course catalog responds with status 400
    And the course catalog error code is "INVALID_QUERY_PARAMETER"
    And the course catalog error message is "One or more query parameters are invalid."
    And the course catalog error detail for "<field>" is "<message>"

    Examples:
      | query           | field    | message                                              |
      | modality=remote | modality | modality must be one of online, in-person, hybrid.  |
      | status=archived | status   | status must be one of draft, active, retired.       |
      | page=0          | page     | page must be an integer greater than or equal to 1. |
      | page=abc        | page     | page must be an integer greater than or equal to 1. |
      | pageSize=51     | pageSize | pageSize must be between 1 and 50.                  |
      | pageSize=0      | pageSize | pageSize must be between 1 and 50.                  |
      | sort=name       | sort     | sort must be one of title, createdAt, updatedAt.    |

  Scenario: several invalid query parameters are reported together
    When the client requests the course catalog with "modality=remote&pageSize=100"
    Then the course catalog responds with status 400
    And the course catalog error detail for "modality" is "modality must be one of online, in-person, hybrid."
    And the course catalog error detail for "pageSize" is "pageSize must be between 1 and 50."

  Scenario: no matching courses return an empty page
    When the client requests the course catalog with "q=zzzzzz"
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 10
    And the course catalog total items is 0
    And the course catalog total pages is 0
    And the course catalog returns 0 courses

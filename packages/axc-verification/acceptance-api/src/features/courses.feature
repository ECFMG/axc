Feature: Course catalog search

  Scenario: GET /api/courses returns the first page sorted by title
    When the client requests the course catalog
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 10
    And the course catalog total is 12
    And the course ids are "course-010,course-008,course-001,course-011,course-002,course-009,course-006,course-004,course-007,course-003"

  Scenario: Keyword search matches title, summary, and tags regardless of case
    When the client requests the course catalog with "q=SeCuRiTy"
    Then the course catalog responds with status 200
    And the course ids are "course-008,course-001,course-006,course-003,course-012"

  Scenario: Modality, status, and tag filters combine with keyword search
    When the client requests the course catalog with "modality=online"
    Then the course catalog responds with status 200
    And the course ids are "course-001,course-011,course-009,course-006,course-004,course-012"
    When the client requests the course catalog with "status=active"
    Then the course ids are "course-010,course-008,course-001,course-011,course-002,course-006,course-003"
    When the client requests the course catalog with "tag=AI"
    Then the course ids are "course-010,course-001,course-004"
    When the client requests the course catalog with "q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
    Then the course catalog page size is 5
    And the course catalog total is 1
    And the course ids are "course-001"

  Scenario: Pagination returns the requested page
    When the client requests the course catalog with "page=2&pageSize=5"
    Then the course catalog responds with status 200
    And the course catalog page is 2
    And the course catalog page size is 5
    And the course catalog total is 12
    And the course catalog total pages are 3
    And the course ids are "course-009,course-006,course-004,course-007,course-003"

  Scenario: Sorting by createdAt changes the order
    When the client requests the course catalog with "sort=createdAt&pageSize=50"
    Then the course catalog responds with status 200
    And the course ids are "course-005,course-009,course-008,course-002,course-010,course-001,course-006,course-003,course-004,course-007,course-012,course-011"

  Scenario: Invalid query parameters return 400
    When the client requests the course catalog with "modality=classroom&page=0&pageSize=51&sort=rating"
    Then the course catalog responds with status 400
    And the course catalog error code is "INVALID_QUERY_PARAMETER"
    And the course catalog error message is "One or more query parameters are invalid."
    And the course catalog error for "modality" says "modality must be one of online, in-person, hybrid."
    And the course catalog error for "page" says "page must be an integer greater than or equal to 1."
    And the course catalog error for "pageSize" says "pageSize must be between 1 and 50."
    And the course catalog error for "sort" says "sort must be one of title, createdAt, updatedAt."

  Scenario: No matching courses return an empty page
    When the client requests the course catalog with "q=zzzz-not-a-course"
    Then the course catalog responds with status 200
    And the course ids are ""
    And the course catalog total is 0
    And the course catalog total pages are 0
    And the course catalog page is 1
    And the course catalog page size is 10

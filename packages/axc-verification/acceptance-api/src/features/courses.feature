Feature: Course catalog search

  Scenario: Default list is paginated and sorted by title
    When the client requests the course catalog at "/api/courses"
    Then the course catalog responds with status 200
    And the course page is 1
    And the course page size is 10
    And the course total items is 12
    And the course total pages is 2
    And the course ids are "course-009,course-001,course-004,course-010,course-005,course-006,course-007,course-008,course-012,course-003"

  Scenario: Keyword search is case-insensitive
    When the client requests the course catalog at "/api/courses?q=SECURITY"
    Then the course catalog responds with status 200
    And the course ids are "course-001,course-007,course-011,course-002"

  Scenario: Modality, status, and tag filters
    When the client requests the course catalog at "/api/courses?modality=online"
    Then the course catalog responds with status 200
    And the course ids are "course-009,course-001,course-005,course-007,course-011"
    When the client requests the course catalog at "/api/courses?status=active"
    Then the course ids are "course-009,course-001,course-006,course-012,course-011,course-002"
    When the client requests the course catalog at "/api/courses?tag=AI"
    Then the course ids are "course-001,course-006"

  Scenario: Combined keyword, modality, and status filters
    When the client requests the course catalog at "/api/courses?q=security&modality=online&status=active"
    Then the course catalog responds with status 200
    And the course ids are "course-001,course-011"

  Scenario: Pagination limits the page
    When the client requests the course catalog at "/api/courses?page=2&pageSize=5"
    Then the course catalog responds with status 200
    And the course page is 2
    And the course page size is 5
    And the course total items is 12
    And the course total pages is 3
    And the course ids are "course-006,course-007,course-008,course-012,course-003"

  Scenario: Courses can be sorted by createdAt
    When the client requests the course catalog at "/api/courses?sort=createdAt&pageSize=50"
    Then the course catalog responds with status 200
    And the course ids are "course-010,course-004,course-007,course-012,course-001,course-006,course-002,course-003,course-009,course-005,course-008,course-011"

  Scenario: No matches return an empty page
    When the client requests the course catalog at "/api/courses?q=zzzz-not-a-course"
    Then the course catalog responds with status 200
    And the course ids are ""
    And the course total items is 0
    And the course total pages is 0

  Scenario: Invalid query parameters return 400
    When the client requests the course catalog at "/api/courses?modality=remote&status=published&page=0&pageSize=51&sort=rank"
    Then the course catalog responds with status 400
    And the course error code is "INVALID_QUERY_PARAMETER"
    And the course error fields are "modality,status,page,pageSize,sort"

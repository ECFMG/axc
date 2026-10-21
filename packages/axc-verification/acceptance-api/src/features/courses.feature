Feature: Course catalog search

  Scenario: GET /api/courses returns the default page
    When the client requests "/api/courses"
    Then the response status is 200
    And the course page reports page 1, page size 10, total items 13, and total pages 2
    And the course page contains 10 courses

  Scenario: Keyword search is case-insensitive across title, summary, and tags
    When the client requests "/api/courses?q=SECURITY"
    Then the response status is 200
    And the course ids are "course-001,course-011,course-010"

  Scenario: Modality filter returns only online courses
    When the client requests "/api/courses?modality=online&pageSize=50"
    Then the response status is 200
    And the course ids are "course-009,course-001,course-005,course-013,course-006"

  Scenario: Status filter returns only active courses
    When the client requests "/api/courses?status=active&pageSize=50"
    Then the response status is 200
    And the course ids are "course-009,course-001,course-012,course-004,course-013,course-002"

  Scenario: Tag filter is case-insensitive
    When the client requests "/api/courses?tag=AI"
    Then the response status is 200
    And the course ids are "course-001"

  Scenario: Keyword, modality, and status filters combine
    When the client requests "/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
    Then the response status is 200
    And the course page reports page 1, page size 5, total items 1, and total pages 1
    And the course ids are "course-001"

  Scenario: Pagination limits the page
    When the client requests "/api/courses?page=2&pageSize=5"
    Then the response status is 200
    And the course page reports page 2, page size 5, total items 13, and total pages 3
    And the course ids are "course-008,course-013,course-007,course-006,course-002"

  Scenario: Results can be sorted by createdAt
    When the client requests "/api/courses?sort=createdAt&pageSize=50"
    Then the response status is 200
    And the course ids are "course-006,course-008,course-010,course-004,course-013,course-012,course-001,course-002,course-009,course-003,course-005,course-007,course-011"

  Scenario: Invalid query parameters return 400
    When the client requests "/api/courses?modality=classroom&status=published&page=0&pageSize=51&sort=name"
    Then the response status is 400
    And the invalid query error for "pageSize" says "pageSize must be between 1 and 50."
    And the error fields are "modality,status,page,pageSize,sort"

  Scenario: No matches return an empty page
    When the client requests "/api/courses?q=zzzz-no-such-course"
    Then the response status is 200
    And the course page reports page 1, page size 10, total items 0, and total pages 0
    And the course page contains no courses

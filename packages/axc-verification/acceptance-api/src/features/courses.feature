Feature: Course search

  Scenario: Default search is paginated
    When the client searches courses at "/api/courses"
    Then the course search responds with status 200
    And the course page number is 1
    And the course page size is 10
    And the course page reports 12 total items
    And the course page contains 10 courses

  Scenario: Keyword, modality, status, and tag filters combine
    When the client searches courses at "/api/courses?q=foundations&modality=online&status=active&tag=ai&sort=title"
    Then the course search responds with status 200
    And the course page contains 1 courses
    And the first course id is "course-001"

  Scenario: Courses can be sorted by createdAt
    When the client searches courses at "/api/courses?sort=createdAt&pageSize=1"
    Then the course search responds with status 200
    And the first course id is "course-010"

  Scenario: Invalid pageSize is rejected
    When the client searches courses at "/api/courses?pageSize=51"
    Then the course search responds with status 400
    And the error code is "INVALID_QUERY_PARAMETER"

  Scenario: No matching courses return an empty page
    When the client searches courses at "/api/courses?q=zzzz-not-a-course"
    Then the course search responds with status 200
    And the course page contains 0 courses
    And the course page reports 0 total items

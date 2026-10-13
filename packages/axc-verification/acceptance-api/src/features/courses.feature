Feature: Course catalog search

  Scenario: Default list uses page 1 and page size 10
    When the client requests the course path "/api/courses"
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 10
    And the course catalog returns 10 items
    And the course catalog total items are 13
    And the course catalog total pages are 2

  Scenario: Keyword, modality, and status filters combine
    When the client requests the course path "/api/courses?q=security&modality=online&status=active"
    Then the course catalog responds with status 200
    And the course catalog item ids are "course-001,course-004"

  Scenario: Courses can be sorted by createdAt
    When the client requests the course path "/api/courses?sort=createdAt"
    Then the course catalog responds with status 200
    And the first course id is "course-010"

  Scenario: Invalid page size is rejected
    When the client requests the course path "/api/courses?pageSize=51"
    Then the course catalog responds with status 400
    And the course catalog error code is "INVALID_QUERY_PARAMETER"
    And the course catalog error field "pageSize" says "pageSize must be between 1 and 50."

  Scenario: Invalid modality is rejected
    When the client requests the course path "/api/courses?modality=classroom"
    Then the course catalog responds with status 400
    And the course catalog error code is "INVALID_QUERY_PARAMETER"

  Scenario: No matching courses return an empty page
    When the client requests the course path "/api/courses?q=zzzz-not-a-course"
    Then the course catalog responds with status 200
    And the course catalog returns 0 items
    And the course catalog total items are 0
    And the course catalog total pages are 0

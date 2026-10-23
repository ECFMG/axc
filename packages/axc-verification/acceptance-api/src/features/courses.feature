Feature: Course catalog search

  Scenario: GET /api/courses returns the default page
    When the client requests "/api/courses"
    Then the response status is 200
    And the course list page is 1
    And the course list page size is 10
    And the course list has at most 10 items
    And the course list total items is at least 12
    And every course item has the catalog fields

  Scenario: GET /api/courses?q=security matches title, summary, or tags
    When the client requests "/api/courses?q=security"
    Then the response status is 200
    And every course item matches the keyword "security"

  Scenario: GET /api/courses?q=SECURITY is case-insensitive
    When the client requests "/api/courses?q=SECURITY"
    Then the response status is 200
    And every course item matches the keyword "security"

  Scenario: GET /api/courses?modality=online returns only online courses
    When the client requests "/api/courses?modality=online"
    Then the response status is 200
    And every course item has modality "online"

  Scenario: GET /api/courses?status=active returns only active courses
    When the client requests "/api/courses?status=active"
    Then the response status is 200
    And every course item has status "active"

  Scenario: GET /api/courses?tag=ai returns courses tagged ai
    When the client requests "/api/courses?tag=ai"
    Then the response status is 200
    And every course item has tag "ai"

  Scenario: GET /api/courses?tag=AI matches tags case-insensitively
    When the client requests "/api/courses?tag=AI"
    Then the response status is 200
    And every course item has tag "ai"

  Scenario: GET /api/courses?page=1&pageSize=5 paginates
    When the client requests "/api/courses?page=1&pageSize=5"
    Then the response status is 200
    And the course list page is 1
    And the course list page size is 5
    And the course list has at most 5 items
    And the course list total pages is consistent

  Scenario: GET /api/courses?sort=createdAt sorts by createdAt
    When the client requests "/api/courses?sort=createdAt&pageSize=50"
    Then the response status is 200
    And the course items are sorted by "createdAt"

  Scenario: GET /api/courses combines q, modality, and status
    When the client requests "/api/courses?q=ai&modality=online&status=active"
    Then the response status is 200
    And every course item has modality "online"
    And every course item has status "active"
    And every course item matches the keyword "ai"

  Scenario: GET /api/courses with no matches returns an empty list
    When the client requests "/api/courses?q=no-such-course-token"
    Then the response status is 200
    And the course list is empty
    And the course list total items is 0

  Scenario: Invalid query parameters return 400
    When the client requests "/api/courses?modality=remote&page=0&pageSize=51&sort=popularity&status=published"
    Then the response status is 400
    And the error code is "INVALID_QUERY_PARAMETER"
    And the error details include fields "modality,status,page,pageSize,sort"

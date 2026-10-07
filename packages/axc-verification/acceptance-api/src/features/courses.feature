Feature: Course catalog search

  Scenario: GET /api/courses returns the default page
    When the client requests the course catalog
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 10
    And the course catalog returns 10 courses
    And the course catalog total items is 13

  Scenario: Keyword search is case-insensitive
    When the client requests the course catalog with query "q=SECURITY"
    Then the course catalog responds with status 200
    And every course matches keyword "security"
    And the course catalog includes course "course-001"

  Scenario: Modality filter returns only online courses
    When the client requests the course catalog with query "modality=online&pageSize=50"
    Then the course catalog responds with status 200
    And every course modality is "online"

  Scenario: Status filter returns only active courses
    When the client requests the course catalog with query "status=active&pageSize=50"
    Then the course catalog responds with status 200
    And every course status is "active"

  Scenario: Tag filter is case-insensitive
    When the client requests the course catalog with query "tag=AI&pageSize=50"
    Then the course catalog responds with status 200
    And every course includes tag "ai"
    And the course catalog includes course "course-001"

  Scenario: Combined keyword, modality, and status filters
    When the client requests the course catalog with query "q=security&modality=online&status=active&pageSize=50"
    Then the course catalog responds with status 200
    And every course modality is "online"
    And every course status is "active"
    And every course matches keyword "security"
    And the course catalog includes course "course-001"

  Scenario: Pagination limits the page
    When the client requests the course catalog with query "page=1&pageSize=5"
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 5
    And the course catalog returns 5 courses
    And the course catalog total pages is 3

  Scenario: Sort by createdAt
    When the client requests the course catalog with query "sort=createdAt&pageSize=50"
    Then the course catalog responds with status 200
    And the courses are sorted by createdAt

  Scenario: Invalid modality, status, page, pageSize, and sort
    When the client requests the course catalog with query "modality=remote&status=published&page=0&pageSize=51&sort=name"
    Then the course catalog responds with status 400
    And the course catalog error code is "INVALID_QUERY_PARAMETER"
    And the course catalog error includes field "pageSize" and message "pageSize must be between 1 and 50."

  Scenario: No matching courses return an empty page
    When the client requests the course catalog with query "q=zzzz-no-such-course"
    Then the course catalog responds with status 200
    And the course catalog returns 0 courses
    And the course catalog total items is 0
    And the course catalog total pages is 0

Feature: Course catalog
  Scenario: Default catalog page
    When the client requests courses at "/api/courses"
    Then the catalog responds with status 200
    And the catalog page contains 10 items with 12 total items and 2 total pages

  Scenario: Combined catalog filters
    When the client requests courses at "/api/courses?q=SECURITY&modality=online&status=active&tag=AI"
    Then the catalog responds with status 200
    And the catalog page contains 1 items with 1 total items and 1 total pages
    And the first catalog course is "course-001"

  Scenario: Pagination in created order
    When the client requests courses at "/api/courses?page=2&pageSize=5&sort=createdAt"
    Then the catalog responds with status 200
    And the catalog page contains 5 items with 12 total items and 3 total pages
    And the first catalog course is "course-006"

  Scenario: No matching courses
    When the client requests courses at "/api/courses?q=does-not-exist"
    Then the catalog responds with status 200
    And the catalog page contains 0 items with 0 total items and 0 total pages

  Scenario: Invalid page size
    When the client requests courses at "/api/courses?pageSize=51"
    Then the catalog responds with status 400
    And the catalog error identifies "pageSize"

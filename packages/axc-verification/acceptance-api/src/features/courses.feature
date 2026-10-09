Feature: Course catalog search
  Scenario: Default catalog page
    When the client requests courses at "/api/courses"
    Then the catalog responds with status 200
    And the catalog page has 10 items, page 1, page size 10, total 12, and 2 pages

  Scenario: Combined keyword, modality, status, and tag filters
    When the client requests courses at "/api/courses?q=SECURITY&modality=online&status=active&tag=AI&pageSize=5"
    Then the catalog responds with status 200
    And the catalog page has 1 items, page 1, page size 5, total 1, and 1 pages
    And the first course is "course-001"

  Scenario: Tags and pagination
    When the client requests courses at "/api/courses?tag=ai&status=active&page=2&pageSize=2"
    Then the catalog responds with status 200
    And the catalog page has 1 items, page 2, page size 2, total 3, and 2 pages
    And the first course is "course-012"

  Scenario: Date sorting
    When the client requests courses at "/api/courses?sort=createdAt&pageSize=5"
    Then the catalog responds with status 200
    And the first course is "course-012"

  Scenario: No matching courses
    When the client requests courses at "/api/courses?q=absent-course"
    Then the catalog responds with status 200
    And the catalog page has 0 items, page 1, page size 10, total 0, and 0 pages

  Scenario Outline: Invalid query parameters
    When the client requests courses at "/api/courses?<field>=<value>"
    Then the catalog responds with status 400
    And the catalog error identifies "<field>"
    Examples:
      | field    | value   |
      | modality | remote  |
      | status   | unknown |
      | page     | 0       |
      | pageSize | 51      |
      | sort     | id      |

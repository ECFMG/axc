Feature: Course catalog
  Scenario: Default catalog
    When the client requests courses with query ""
    Then the course response status is 200
    And the catalog has 10 items and 12 total matches

  Scenario: Combined search filters
    When the client requests courses with query "q=SECURITY&modality=online&status=active&tag=AI"
    Then the course response status is 200
    And the catalog has 1 items and 1 total matches
    And the first course ID is "course-001"

  Scenario: Pagination and sorting
    When the client requests courses with query "page=2&pageSize=5&sort=createdAt"
    Then the course response status is 200
    And the catalog has 5 items and 12 total matches
    And the first course ID is "course-006"

  Scenario: No matching courses
    When the client requests courses with query "q=no-such-course"
    Then the course response status is 200
    And the catalog has 0 items and 0 total matches

  Scenario: Invalid page size
    When the client requests courses with query "pageSize=51"
    Then the course response status is 400
    And the course error code is "INVALID_QUERY_PARAMETER"

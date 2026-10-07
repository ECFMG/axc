Feature: Course catalog search

  Scenario: Default list
    When the client requests courses with ""
    Then the course response status is 200
    And the course response has page 1, page size 10, total 12, and 10 items

  Scenario: Combined search filters
    When the client requests courses with "?q=SECURITY&modality=online&status=active&tag=AI"
    Then the course response status is 200
    And the course response contains only "course-001"

  Scenario: Additional filters
    When the client requests courses with "?modality=in-person&status=active&tag=SECURITY"
    Then the course response status is 200
    And the course response contains only "course-007"

  Scenario: Pagination and sorting
    When the client requests courses with "?page=2&pageSize=5&sort=createdAt"
    Then the course response status is 200
    And the course response has page 2, page size 5, total 12, and 5 items
    And the first course is "course-011"

  Scenario: No matching courses
    When the client requests courses with "?q=does-not-exist"
    Then the course response status is 200
    And the course response has page 1, page size 10, total 0, and 0 items

  Scenario Outline: Invalid query parameters
    When the client requests courses with "<query>"
    Then the course response status is 400
    And the course error code is "INVALID_QUERY_PARAMETER" for "<field>"

    Examples:
      | query             | field    |
      | ?modality=remote  | modality |
      | ?status=unknown   | status   |
      | ?page=0           | page     |
      | ?pageSize=51      | pageSize |
      | ?sort=rank        | sort     |
      | ?unknown=value    | unknown  |

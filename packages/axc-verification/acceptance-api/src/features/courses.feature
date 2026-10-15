Feature: Course catalog search

  Scenario: GET /api/courses returns the first page sorted by title
    When the client requests "/api/courses"
    Then the response status is 200
    And the courses page is 1
    And the courses page size is 10
    And the courses total is 13
    And the courses page count is 2
    And the courses page contains 10 items
    And the first course is "course-012"
    And the courses are sorted by title

  Scenario: keyword search matches title, summary, and tags regardless of case
    When the client requests "/api/courses?q=SeCuRiTy&pageSize=50"
    Then the response status is 200
    And the course ids are "course-001,course-011,course-005,course-004"

  Scenario: modality filter returns only online courses
    When the client requests "/api/courses?modality=online&pageSize=50"
    Then the response status is 200
    And every course "modality" is "online"

  Scenario: status filter returns only active courses
    When the client requests "/api/courses?status=active&pageSize=50"
    Then the response status is 200
    And every course "status" is "active"

  Scenario: tag filter matches tags regardless of case
    When the client requests "/api/courses?tag=AI&pageSize=50"
    Then the response status is 200
    And the course ids are "course-001,course-009"

  Scenario: combined keyword modality and status filters
    When the client requests "/api/courses?q=security&modality=online&status=active&pageSize=50"
    Then the response status is 200
    And the course ids are "course-001,course-005"

  Scenario: pagination limits the page
    When the client requests "/api/courses?page=2&pageSize=5"
    Then the response status is 200
    And the courses page is 2
    And the courses page size is 5
    And the courses total is 13
    And the courses page count is 3
    And the courses page contains 5 items

  Scenario: sort by createdAt
    When the client requests "/api/courses?sort=createdAt&pageSize=50"
    Then the response status is 200
    And the first course is "course-013"
    And the courses are sorted by createdAt

  Scenario Outline: invalid query parameters return 400
    When the client requests "<path>"
    Then the response status is 400
    And the error code is "INVALID_QUERY_PARAMETER"
    And the error message is "One or more query parameters are invalid."
    And the error details include field "<field>"

    Examples:
      | path                          | field    |
      | /api/courses?modality=remote  | modality |
      | /api/courses?status=published | status   |
      | /api/courses?page=0           | page     |
      | /api/courses?pageSize=51      | pageSize |
      | /api/courses?sort=name        | sort     |

  Scenario: no matches return an empty page
    When the client requests "/api/courses?q=zzzz-no-such-course"
    Then the response status is 200
    And the courses page contains 0 items
    And the courses total is 0
    And the courses page count is 0
    And the courses page is 1
    And the courses page size is 10

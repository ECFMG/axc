Feature: Course catalog search

  Scenario: GET /api/courses returns a paginated list using default pagination
    When the client requests the course catalog
    Then the courses response status is 200
    And the courses page is 1
    And the courses page size is 10
    And the courses page contains 10 items
    And the courses total items is 12
    And the courses total pages is 2
    And each course item matches the course contract

  Scenario: GET /api/courses?q=security matches title, summary, or tags regardless of case
    When the client requests courses with "q=security"
    Then the courses response status is 200
    And the course ids are "course-001,course-002,course-003,course-004"

  Scenario: GET /api/courses?modality=online returns only online courses
    When the client requests courses with "modality=online"
    Then the courses response status is 200
    And every course has modality "online"
    And the courses total items is 5

  Scenario: GET /api/courses?status=active returns only active courses
    When the client requests courses with "status=active"
    Then the courses response status is 200
    And every course has status "active"
    And the courses total items is 6

  Scenario: GET /api/courses?tag=ai returns courses containing the ai tag
    When the client requests courses with "tag=AI"
    Then the courses response status is 200
    And every course has tag "ai"
    And the courses total items is 3

  Scenario: GET /api/courses?page=1&pageSize=5 returns no more than 5 items and pagination metadata
    When the client requests courses with "page=1&pageSize=5"
    Then the courses response status is 200
    And the courses page is 1
    And the courses page size is 5
    And the courses page contains 5 items
    And the courses total items is 12
    And the courses total pages is 3

  Scenario: GET /api/courses?sort=createdAt returns records sorted by createdAt
    When the client requests courses with "sort=createdAt"
    Then the courses response status is 200
    And the course items are sorted by "createdAt"

  Scenario Outline: Invalid <field> values return HTTP 400
    When the client requests courses with "<query>"
    Then the courses response status is 400
    And the courses error code is "INVALID_QUERY_PARAMETER"
    And the courses error message is "One or more query parameters are invalid."
    And the courses error detail for "<field>" is "<message>"

    Examples:
      | field    | query            | message                                                 |
      | modality | modality=remote  | modality must be one of online, in-person, hybrid.     |
      | status   | status=published | status must be one of draft, active, retired.          |
      | page     | page=0           | page must be an integer greater than or equal to 1.    |
      | pageSize | pageSize=51      | pageSize must be between 1 and 50.                     |
      | sort     | sort=name        | sort must be one of title, createdAt, updatedAt.       |

  Scenario: No matching courses return an empty list
    When the client requests courses with "q=zzzz-not-a-course"
    Then the courses response status is 200
    And the courses page contains 0 items
    And the courses page is 1
    And the courses page size is 10
    And the courses total items is 0
    And the courses total pages is 0

  Scenario: Keyword, modality, and status filters combine
    When the client requests courses with "q=security&modality=online&status=active"
    Then the courses response status is 200
    And the course ids are "course-001,course-004"

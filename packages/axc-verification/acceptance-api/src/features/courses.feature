Feature: Course search

  Scenario: GET /api/courses returns a paginated list using default pagination
    When the client searches courses
    Then the response status is 200
    And the course page is page 1 of size 10 with 12 total items and 2 total pages
    And the course page has 10 items
    And the first course id is "course-001"

  Scenario: GET /api/courses?q=security matches title, summary, or tags regardless of case
    When the client searches courses with query "q=SeCuRiTy&pageSize=50"
    Then the response status is 200
    And every course matches the keyword "security"
    And the course ids include "course-001"
    And the course ids include "course-003"
    And the course ids include "course-009"
    And the course ids exclude "course-004"

  Scenario: GET /api/courses?modality=online returns only online courses
    When the client searches courses with query "modality=online&pageSize=50"
    Then the response status is 200
    And every course modality is "online"
    And the course ids include "course-001"
    And the course ids exclude "course-002"

  Scenario: GET /api/courses?status=active returns only active courses
    When the client searches courses with query "status=active&pageSize=50"
    Then the response status is 200
    And every course status is "active"
    And the course ids include "course-001"
    And the course ids exclude "course-005"

  Scenario: GET /api/courses?tag=ai returns courses containing the ai tag
    When the client searches courses with query "tag=AI&pageSize=50"
    Then the response status is 200
    And every course tag list contains "ai"
    And the course ids include "course-001"
    And the course ids exclude "course-002"

  Scenario: GET /api/courses?page=1&pageSize=5 returns no more than 5 items
    When the client searches courses with query "page=1&pageSize=5"
    Then the response status is 200
    And the course page is page 1 of size 5 with 12 total items and 3 total pages
    And the course page has 5 items

  Scenario: GET /api/courses?sort=createdAt returns records sorted by createdAt
    When the client searches courses with query "sort=createdAt&pageSize=50"
    Then the response status is 200
    And the first course id is "course-006"
    And the courses are sorted by createdAt

  Scenario: Keyword, modality, and status filters combine
    When the client searches courses with query "q=security&modality=online&status=active&pageSize=50"
    Then the response status is 200
    And the course ids are "course-001,course-003"

  Scenario: No matching courses return an empty list
    When the client searches courses with query "q=not-a-course-keyword"
    Then the response status is 200
    And the course page is page 1 of size 10 with 0 total items and 0 total pages
    And the course page has 0 items

  Scenario Outline: Invalid <field> values return HTTP 400
    When the client searches courses with query "<query>"
    Then the response status is 400
    And the error code is "INVALID_QUERY_PARAMETER"
    And the error details include field "<field>"

    Examples:
      | field    | query              |
      | modality | modality=classroom |
      | status   | status=published   |
      | page     | page=0             |
      | pageSize | pageSize=51        |
      | sort     | sort=popularity    |

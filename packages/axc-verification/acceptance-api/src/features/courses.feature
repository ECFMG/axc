Feature: Course catalog search

  Scenario: GET /api/courses returns the first page with default pagination
    When the client searches courses with ""
    Then the courses response has status 200
    And the courses page metadata is page 1, pageSize 10, totalItems 14, totalPages 2
    And the courses response contains 10 items
    And the courses are sorted by title

  Scenario: Keyword search ignores case across title, summary, and tags
    When the client searches courses with "q=SECURITY&pageSize=50"
    Then the courses response has status 200
    And the course ids are "course-001,course-006,course-009,course-011,course-003,course-014"

  Scenario Outline: Filtering by <field> returns only matching courses
    When the client searches courses with "<field>=<value>&pageSize=50"
    Then the courses response has status 200
    And every course has <field> "<value>"

    Examples:
      | field    | value  |
      | modality | online |
      | status   | active |

  Scenario: Tag filter ignores case
    When the client searches courses with "tag=AI"
    Then the courses response has status 200
    And the course ids are "course-007,course-001,course-012,course-002"

  Scenario: Keyword, modality, and status filters combine
    When the client searches courses with "q=security&modality=online&status=active"
    Then the courses response has status 200
    And the course ids are "course-001,course-006"

  Scenario: Page size limits the page and reports pagination metadata
    When the client searches courses with "page=1&pageSize=5"
    Then the courses response has status 200
    And the courses response contains 5 items
    And the courses page metadata is page 1, pageSize 5, totalItems 14, totalPages 3

  Scenario: Sorting by createdAt returns the oldest course first
    When the client searches courses with "sort=createdAt&pageSize=50"
    Then the courses response has status 200
    And the courses are sorted by createdAt

  Scenario: No matches return an empty page, not an error
    When the client searches courses with "q=quantum-basket-weaving"
    Then the courses response has status 200
    And the courses response contains 0 items
    And the courses page metadata is page 1, pageSize 10, totalItems 0, totalPages 0

  Scenario Outline: Invalid <field> is rejected with HTTP 400
    When the client searches courses with "<query>"
    Then the courses response has status 400
    And the error response reports an invalid "<field>"

    Examples:
      | field    | query           |
      | modality | modality=remote |
      | status   | status=archived |
      | page     | page=0          |
      | page     | page=abc        |
      | pageSize | pageSize=51     |
      | sort     | sort=popularity |

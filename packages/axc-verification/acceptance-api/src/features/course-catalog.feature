Feature: Course catalog search

  The training catalog is served by GET /api/courses and supports keyword search,
  filtering, pagination and sorting.

  Scenario: Default pagination returns the first page of the catalog
    When the client requests "/api/courses"
    Then the catalog responds with status 200
    And the catalog page is page 1 of size 10 with 12 total items across 2 pages
    And the catalog returns 10 items

  Scenario: Keyword search matches title, summary and tags regardless of case
    When the client requests "/api/courses?q=SECURITY"
    Then the catalog responds with status 200
    And the catalog item ids are "course-001,course-004,course-010,course-012"

  Scenario: Modality filter returns only online courses
    When the client requests "/api/courses?modality=online"
    Then the catalog responds with status 200
    And every catalog item has "modality" equal to "online"
    And the catalog returns 5 items

  Scenario: Status filter returns only retired courses
    When the client requests "/api/courses?status=retired"
    Then the catalog responds with status 200
    And every catalog item has "status" equal to "retired"
    And the catalog item ids are "course-008,course-012"

  Scenario: Tag filter is case-insensitive
    When the client requests "/api/courses?tag=AI"
    Then the catalog responds with status 200
    And the catalog item ids are "course-001,course-002,course-007"

  Scenario: Combined filters narrow the catalog to a single course
    When the client requests "/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
    Then the catalog responds with status 200
    And the catalog page is page 1 of size 5 with 1 total items across 1 pages
    And the catalog item ids are "course-001"

  Scenario: Pagination returns the requested slice
    When the client requests "/api/courses?page=2&pageSize=5"
    Then the catalog responds with status 200
    And the catalog page is page 2 of size 5 with 12 total items across 3 pages
    And the catalog item ids are "course-006,course-007,course-008,course-009,course-010"

  Scenario: Sorting by createdAt orders the catalog by creation date
    When the client requests "/api/courses?sort=createdAt"
    Then the catalog responds with status 200
    And the catalog items are sorted ascending by "createdAt"

  Scenario: A query that matches nothing returns an empty page
    When the client requests "/api/courses?q=quantum-basket-weaving"
    Then the catalog responds with status 200
    And the catalog page is page 1 of size 10 with 0 total items across 0 pages
    And the catalog returns 0 items

  Scenario Outline: Invalid query parameters are rejected
    When the client requests "<path>"
    Then the catalog responds with status 400
    And the catalog error code is "INVALID_QUERY_PARAMETER" naming "<field>"

    Examples:
      | path                            | field    |
      | /api/courses?modality=remote    | modality |
      | /api/courses?status=archived    | status   |
      | /api/courses?sort=rating        | sort     |
      | /api/courses?page=0             | page     |
      | /api/courses?pageSize=51        | pageSize |

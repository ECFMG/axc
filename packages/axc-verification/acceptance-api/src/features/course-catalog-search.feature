Feature: Course catalog search

  Users browse the training catalog through GET /api/courses, narrowing results
  by keyword, modality, status, and tag, and paging through what is left.

  Scenario: Listing the catalog with default pagination
    When the client searches the course catalog with ""
    Then the catalog responds with status 200
    And the catalog page reports page 1, page size 10, 14 total items, and 2 total pages
    And the catalog returns the course ids "course-014,course-002,course-001,course-013,course-009,course-010,course-006,course-005,course-012,course-008"
    And every returned course carries the full course contract

  Scenario: Keyword search matches title, summary, and tags regardless of case
    When the client searches the course catalog with "q=SeCuRiTy"
    Then the catalog responds with status 200
    And the catalog returns the course ids "course-001,course-003,course-007"

  Scenario: Filtering by modality
    When the client searches the course catalog with "modality=online&pageSize=50"
    Then the catalog responds with status 200
    And the catalog page reports page 1, page size 50, 6 total items, and 1 total pages
    And every returned course has modality "online"

  Scenario: Filtering by status
    When the client searches the course catalog with "status=retired&pageSize=50"
    Then the catalog responds with status 200
    And the catalog page reports page 1, page size 50, 3 total items, and 1 total pages
    And every returned course has status "retired"

  Scenario: Filtering by tag, ignoring case
    When the client searches the course catalog with "tag=AI"
    Then the catalog responds with status 200
    And the catalog returns the course ids "course-002,course-001,course-004"
    And every returned course has tag "ai"

  Scenario: Combining keyword, modality, and status filters
    When the client searches the course catalog with "q=security&modality=online&status=active"
    Then the catalog responds with status 200
    And the catalog returns the course ids "course-001,course-007"

  Scenario: Paging through the catalog
    When the client searches the course catalog with "page=2&pageSize=5"
    Then the catalog responds with status 200
    And the catalog page reports page 2, page size 5, 14 total items, and 3 total pages
    And the catalog returns the course ids "course-010,course-006,course-005,course-012,course-008"

  Scenario: Sorting by createdAt
    When the client searches the course catalog with "sort=createdAt&pageSize=50"
    Then the catalog responds with status 200
    And the catalog page is sorted by "createdAt" ascending
    And the catalog returns the course ids starting with "course-005,course-009,course-013"

  Scenario: Sorting by updatedAt
    When the client searches the course catalog with "sort=updatedAt&pageSize=50"
    Then the catalog responds with status 200
    And the catalog page is sorted by "updatedAt" ascending

  Scenario: A search with no matches is an empty page, not an error
    When the client searches the course catalog with "q=quantum-basket-weaving"
    Then the catalog responds with status 200
    And the catalog page reports page 1, page size 10, 0 total items, and 0 total pages
    And the catalog returns no courses

  Scenario: Unknown query parameters are ignored
    When the client searches the course catalog with "unsupported=value"
    Then the catalog responds with status 200
    And the catalog page reports page 1, page size 10, 14 total items, and 2 total pages

  Scenario Outline: Invalid query parameters are rejected
    When the client searches the course catalog with "<query>"
    Then the catalog responds with status 400
    And the catalog error reports the invalid fields "<fields>"

    Examples:
      | query                                   | fields                            |
      | modality=remote                         | modality                          |
      | status=archived                         | status                            |
      | sort=relevance                          | sort                              |
      | page=0                                  | page                              |
      | page=-1                                 | page                              |
      | page=two                                | page                              |
      | pageSize=0                              | pageSize                          |
      | pageSize=51                             | pageSize                          |
      | pageSize=abc                            | pageSize                          |
      | modality=remote&page=0&sort=relevance   | modality,page,sort                |

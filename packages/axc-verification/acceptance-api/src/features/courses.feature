Feature: Course catalog search

  Scenario: Default list uses page 1 and page size 10
    When the client requests "/api/courses"
    Then the response status is 200
    And the course page is 1
    And the course page size is 10
    And the course page has 10 items
    And the course total items is 15
    And the course total pages is 2
    And the first course id is "course-001"

  Scenario: Keyword search matches title, summary, and tags regardless of case
    When the client requests "/api/courses?q=SECURITY&pageSize=50"
    Then the response status is 200
    And the course total items is 5
    And the course ids include "course-001"
    And the course ids include "course-014"
    And the course ids include "course-015"
    And every course matches the keyword "security"

  Scenario: Modality filter returns only online courses
    When the client requests "/api/courses?modality=online&pageSize=50"
    Then the response status is 200
    And the course total items is 6
    And every course modality is "online"

  Scenario: Status filter returns only active courses
    When the client requests "/api/courses?status=active&pageSize=50"
    Then the response status is 200
    And the course total items is 8
    And every course status is "active"

  Scenario: Tag filter is case-insensitive
    When the client requests "/api/courses?tag=AI&pageSize=50"
    Then the response status is 200
    And the course total items is 3
    And the course ids include "course-001"
    And the course ids include "course-013"
    And every course has a tag "ai"

  Scenario: Combined keyword, modality, and status filters
    When the client requests "/api/courses?q=security&modality=online&status=active"
    Then the response status is 200
    And the course total items is 1
    And the first course id is "course-001"
    And the first course title is "AI Security Foundations"

  Scenario: Pagination limits the page
    When the client requests "/api/courses?page=2&pageSize=5"
    Then the response status is 200
    And the course page is 2
    And the course page size is 5
    And the course page has 5 items
    And the course total items is 15
    And the course total pages is 3

  Scenario: Sort by createdAt returns the oldest course first
    When the client requests "/api/courses?sort=createdAt&pageSize=50"
    Then the response status is 200
    And the first course id is "course-004"
    And the courses are sorted by createdAt ascending

  Scenario: Invalid modality returns 400
    When the client requests "/api/courses?modality=classroom"
    Then the response status is 400
    And the error code is "INVALID_QUERY_PARAMETER"
    And the error message is "One or more query parameters are invalid."
    And the error details include field "modality"

  Scenario: Invalid status returns 400
    When the client requests "/api/courses?status=published"
    Then the response status is 400
    And the error details include field "status"

  Scenario: Invalid page returns 400
    When the client requests "/api/courses?page=0"
    Then the response status is 400
    And the error details include field "page"

  Scenario: Invalid pageSize returns 400
    When the client requests "/api/courses?pageSize=51"
    Then the response status is 400
    And the error details include field "pageSize"
    And the error detail for "pageSize" says "pageSize must be between 1 and 50."

  Scenario: Invalid sort returns 400
    When the client requests "/api/courses?sort=name"
    Then the response status is 400
    And the error details include field "sort"

  Scenario: No matches return an empty page
    When the client requests "/api/courses?q=zzznomatch"
    Then the response status is 200
    And the course page has 0 items
    And the course total items is 0
    And the course total pages is 0
    And the course page is 1
    And the course page size is 10

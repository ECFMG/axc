Feature: Course catalog search

  Scenario: Default list uses default pagination
    When the client requests "/api/courses"
    Then the response status is 200
    And the course list page is 1
    And the course list pageSize is 10
    And the course list has at most 10 items
    And the course list totalItems is at least 12

  Scenario: Keyword search matches title, summary, and tags regardless of case
    When the client requests "/api/courses?q=SECURITY"
    Then the response status is 200
    And every course matches keyword "security"

  Scenario: Modality filter returns only online courses
    When the client requests "/api/courses?modality=online&pageSize=50"
    Then the response status is 200
    And every course has modality "online"

  Scenario: Status filter returns only active courses
    When the client requests "/api/courses?status=active&pageSize=50"
    Then the response status is 200
    And every course has status "active"

  Scenario: Tag filter matches tags case-insensitively
    When the client requests "/api/courses?tag=AI&pageSize=50"
    Then the response status is 200
    And every course has tag "ai"

  Scenario: Combined keyword, modality, and status filters
    When the client requests "/api/courses?q=security&modality=online&status=active"
    Then the response status is 200
    And the course list contains only ids "course-001"

  Scenario: Pagination returns at most the requested page size
    When the client requests "/api/courses?page=1&pageSize=5"
    Then the response status is 200
    And the course list page is 1
    And the course list pageSize is 5
    And the course list has at most 5 items
    And the course list totalPages matches the item count

  Scenario: Results can be sorted by createdAt
    When the client requests "/api/courses?sort=createdAt&pageSize=50"
    Then the response status is 200
    And the course list is sorted by "createdAt"

  Scenario Outline: Invalid query parameters return HTTP 400
    When the client requests "<path>"
    Then the response status is 400
    And the error code is "INVALID_QUERY_PARAMETER"
    And the error details include field "<field>"

    Examples:
      | path                              | field    |
      | /api/courses?modality=webinar     | modality |
      | /api/courses?status=archived      | status   |
      | /api/courses?page=0               | page     |
      | /api/courses?pageSize=51          | pageSize |
      | /api/courses?sort=popularity      | sort     |

  Scenario: No matching results return an empty list
    When the client requests "/api/courses?q=no-such-course-zzzz"
    Then the response status is 200
    And the course list is empty
    And the course list page is 1
    And the course list pageSize is 10
    And the course list totalItems is 0

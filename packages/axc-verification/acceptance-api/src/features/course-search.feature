Feature: Course Search

  Scenario: Default list uses page 1 and page size 10
    When the client requests GET "/api/courses"
    Then the course response status is 200
    And the course page is 1
    And the course page size is 10
    And the course item count is 10
    And the course total items is 12
    And the course total pages is 2

  Scenario: Keyword search is case insensitive across title summary and tags
    When the client requests GET "/api/courses?q=SeCuRiTy&pageSize=50"
    Then the course response status is 200
    And the course titles include "AI Security Foundations"
    And the course titles include "Network SECURITY Basics"
    And the course titles include "Secure Delivery Lab"
    And the course titles include "Audit Readiness"
    And the course total items is 4

  Scenario: Modality filter returns only online courses
    When the client requests GET "/api/courses?modality=online&pageSize=50"
    Then the course response status is 200
    And the course total items is 5
    And every course modality is "online"

  Scenario: Status filter returns only active courses
    When the client requests GET "/api/courses?status=active&pageSize=50"
    Then the course response status is 200
    And the course total items is 5
    And every course status is "active"

  Scenario: Tag filter is case insensitive
    When the client requests GET "/api/courses?tag=AI&pageSize=50"
    Then the course response status is 200
    And the course total items is 2
    And every course has tag "ai"

  Scenario: Combined keyword modality and status filters
    When the client requests GET "/api/courses?q=security&modality=online&status=active&pageSize=50"
    Then the course response status is 200
    And the course titles include "AI Security Foundations"
    And the course titles include "Audit Readiness"
    And the course total items is 2

  Scenario: Pagination limits the page and reports metadata
    When the client requests GET "/api/courses?page=1&pageSize=5"
    Then the course response status is 200
    And the course page is 1
    And the course page size is 5
    And the course item count is 5
    And the course total items is 12
    And the course total pages is 3
    And the first course title is "AI Security Foundations"

  Scenario: Sort by createdAt returns the oldest course first
    When the client requests GET "/api/courses?sort=createdAt&pageSize=50"
    Then the course response status is 200
    And the first course title is "Example title"

  Scenario Outline: Invalid query parameters return 400
    When the client requests GET "<path>"
    Then the course response status is 400
    And the course error code is "INVALID_QUERY_PARAMETER"
    And the course error field is "<field>"

    Examples:
      | path                              | field    |
      | /api/courses?modality=remote      | modality |
      | /api/courses?status=published     | status   |
      | /api/courses?page=0               | page     |
      | /api/courses?page=abc             | page     |
      | /api/courses?pageSize=0           | pageSize |
      | /api/courses?pageSize=51          | pageSize |
      | /api/courses?sort=rank            | sort     |

  Scenario: No matches return an empty page
    When the client requests GET "/api/courses?q=zzznomatch"
    Then the course response status is 200
    And the course item count is 0
    And the course total items is 0
    And the course total pages is 0
    And the course page is 1
    And the course page size is 10

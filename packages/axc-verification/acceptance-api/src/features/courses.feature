Feature: Course catalog search

  Scenario: Default catalog page
    When the client requests the course catalog
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 10
    And the course catalog contains at least 12 courses
    And the course catalog returns 10 courses
    And the courses are sorted by title

  Scenario: Keyword search is case-insensitive
    When the client requests the course catalog with query "q=SECURITY"
    Then the course catalog responds with status 200
    And every course matches keyword "security"
    And the course catalog includes "AI Security Foundations"
    And the course catalog includes "Secure Coding Basics"

  Scenario: Modality filter
    When the client requests the course catalog with query "modality=online&pageSize=50"
    Then the course catalog responds with status 200
    And every course has modality "online"

  Scenario: Status filter
    When the client requests the course catalog with query "status=active&pageSize=50"
    Then the course catalog responds with status 200
    And every course has status "active"

  Scenario: Tag filter is case-insensitive
    When the client requests the course catalog with query "tag=AI&pageSize=50"
    Then the course catalog responds with status 200
    And every course has tag "ai"
    And the course catalog includes "AI Ethics for Builders"

  Scenario: Combined keyword, modality, and status
    When the client requests the course catalog with query "q=security&modality=online&status=active&pageSize=50"
    Then the course catalog responds with status 200
    And every course matches keyword "security"
    And every course has modality "online"
    And every course has status "active"
    And the course catalog includes "AI Security Foundations"
    And the course catalog includes "Secure Coding Basics"

  Scenario: Example query returns the sample course
    When the client requests the course catalog with query "q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
    Then the course catalog responds with status 200
    And the course catalog returns the AI Security Foundations contract

  Scenario: Pagination metadata
    When the client requests the course catalog with query "page=1&pageSize=5"
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 5
    And the course catalog returns 5 courses
    And the course catalog pagination metadata is consistent

  Scenario: Sort by createdAt
    When the client requests the course catalog with query "sort=createdAt&pageSize=50"
    Then the course catalog responds with status 200
    And the courses are sorted by createdAt

  Scenario Outline: Invalid query parameters return 400
    When the client requests the course catalog with query "<query>"
    Then the course catalog responds with status 400
    And the course catalog error code is "INVALID_QUERY_PARAMETER"
    And the course catalog error message is "One or more query parameters are invalid."
    And the course catalog error details include field "<field>"

    Examples:
      | query               | field    |
      | modality=classroom  | modality |
      | status=archived     | status   |
      | page=0              | page     |
      | pageSize=51         | pageSize |
      | sort=popularity     | sort     |

  Scenario: Invalid pageSize uses the documented message
    When the client requests the course catalog with query "pageSize=0"
    Then the course catalog responds with status 400
    And the course catalog error details include field "pageSize" and message "pageSize must be between 1 and 50."

  Scenario: No matching courses return an empty page
    When the client requests the course catalog with query "q=zzzz-no-such-course"
    Then the course catalog responds with status 200
    And the course catalog returns no courses

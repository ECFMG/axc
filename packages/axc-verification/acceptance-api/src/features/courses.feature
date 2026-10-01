Feature: Course catalog search

  Scenario: GET /api/courses returns a paginated list with defaults
    When the client requests the course catalog
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 10
    And the course catalog returns at most 10 items
    And the course catalog total items is at least 12
    And the course catalog includes pagination metadata

  Scenario: Keyword search matches title, summary, or tags regardless of case
    When the client requests the course catalog with query "q=SECURITY"
    Then the course catalog responds with status 200
    And every returned course matches keyword "security"
    And the course catalog returns at least 1 item

  Scenario: Filter by modality
    When the client requests the course catalog with query "modality=online"
    Then the course catalog responds with status 200
    And every returned course has modality "online"

  Scenario: Filter by status
    When the client requests the course catalog with query "status=active"
    Then the course catalog responds with status 200
    And every returned course has status "active"

  Scenario: Filter by tag
    When the client requests the course catalog with query "tag=AI"
    Then the course catalog responds with status 200
    And every returned course has tag "ai"

  Scenario: Combined keyword, modality, and status filters
    When the client requests the course catalog with query "q=security&modality=online&status=active"
    Then the course catalog responds with status 200
    And every returned course matches keyword "security"
    And every returned course has modality "online"
    And every returned course has status "active"

  Scenario: Pagination returns at most the requested page size
    When the client requests the course catalog with query "page=1&pageSize=5"
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 5
    And the course catalog returns at most 5 items
    And the course catalog includes pagination metadata

  Scenario: Sort by createdAt
    When the client requests the course catalog with query "sort=createdAt&pageSize=50"
    Then the course catalog responds with status 200
    And the returned courses are sorted by "createdAt"

  Scenario: Invalid modality returns HTTP 400
    When the client requests the course catalog with query "modality=remote"
    Then the course catalog responds with status 400
    And the course catalog error code is "INVALID_QUERY_PARAMETER"
    And the course catalog error details include field "modality"

  Scenario: Invalid status returns HTTP 400
    When the client requests the course catalog with query "status=published"
    Then the course catalog responds with status 400
    And the course catalog error code is "INVALID_QUERY_PARAMETER"
    And the course catalog error details include field "status"

  Scenario: Invalid page returns HTTP 400
    When the client requests the course catalog with query "page=0"
    Then the course catalog responds with status 400
    And the course catalog error code is "INVALID_QUERY_PARAMETER"
    And the course catalog error details include field "page"

  Scenario: Invalid pageSize returns HTTP 400
    When the client requests the course catalog with query "pageSize=51"
    Then the course catalog responds with status 400
    And the course catalog error code is "INVALID_QUERY_PARAMETER"
    And the course catalog error details include field "pageSize"

  Scenario: Invalid sort returns HTTP 400
    When the client requests the course catalog with query "sort=popularity"
    Then the course catalog responds with status 400
    And the course catalog error code is "INVALID_QUERY_PARAMETER"
    And the course catalog error details include field "sort"

  Scenario: No matching courses return an empty list
    When the client requests the course catalog with query "q=zzzz-no-such-course"
    Then the course catalog responds with status 200
    And the course catalog returns 0 items
    And the course catalog total items is 0
    And the course catalog includes pagination metadata

Feature: Course catalog search

  Scenario: Default list uses page 1 and page size 10
    When the client requests the course catalog
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 10
    And the course catalog item count is 10
    And the course catalog total items is 13
    And the course catalog total pages is 2
    And the first course id is "course-009"

  Scenario: Keyword search matches title, summary, and tags regardless of case
    When the client requests the course catalog with query "q=SECURITY"
    Then the course catalog responds with status 200
    And the course catalog item ids are "course-001,course-011,course-010"
    And every course matches keyword "security"

  Scenario: Modality filter returns only online courses
    When the client requests the course catalog with query "modality=online&pageSize=50"
    Then the course catalog responds with status 200
    And the course catalog total items is 5
    And every course modality is "online"

  Scenario: Status filter returns only active courses
    When the client requests the course catalog with query "status=active&pageSize=50"
    Then the course catalog responds with status 200
    And the course catalog total items is 6
    And every course status is "active"

  Scenario: Tag filter is case-insensitive
    When the client requests the course catalog with query "tag=AI"
    Then the course catalog responds with status 200
    And the course catalog item ids are "course-001"

  Scenario: Combined keyword, modality, and status filters
    When the client requests the course catalog with query "q=security&modality=online&status=active"
    Then the course catalog responds with status 200
    And the course catalog item ids are "course-001"
    And the course catalog total items is 1

  Scenario: Pagination limits the page
    When the client requests the course catalog with query "page=1&pageSize=5"
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 5
    And the course catalog item count is 5
    And the course catalog total items is 13
    And the course catalog total pages is 3

  Scenario: Sort by createdAt returns the oldest course first
    When the client requests the course catalog with query "sort=createdAt&pageSize=50"
    Then the course catalog responds with status 200
    And courses are sorted by createdAt ascending
    And the first course id is "course-006"

  Scenario: Invalid modality returns 400
    When the client requests the course catalog with query "modality=weekend"
    Then the course catalog responds with status 400
    And the course catalog error code is "INVALID_QUERY_PARAMETER"
    And the course catalog error details include field "modality"

  Scenario: Invalid status returns 400
    When the client requests the course catalog with query "status=archived"
    Then the course catalog responds with status 400
    And the course catalog error details include field "status"

  Scenario: Invalid page returns 400
    When the client requests the course catalog with query "page=0"
    Then the course catalog responds with status 400
    And the course catalog error details include field "page"

  Scenario: Invalid pageSize returns 400
    When the client requests the course catalog with query "pageSize=51"
    Then the course catalog responds with status 400
    And the course catalog error code is "INVALID_QUERY_PARAMETER"
    And the course catalog error message is "One or more query parameters are invalid."
    And the course catalog error details include "pageSize must be between 1 and 50." for field "pageSize"

  Scenario: Invalid sort returns 400
    When the client requests the course catalog with query "sort=popularity"
    Then the course catalog responds with status 400
    And the course catalog error details include field "sort"

  Scenario: No matches return an empty page
    When the client requests the course catalog with query "q=zzzz-no-such-course"
    Then the course catalog responds with status 200
    And the course catalog items are empty
    And the course catalog page is 1
    And the course catalog page size is 10
    And the course catalog total items is 0
    And the course catalog total pages is 0

Feature: Course catalog search

  Scenario: default list uses page 1 and page size 10
    When the client requests the course catalog
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 10
    And the course catalog item count is 10
    And the course catalog total items is 12
    And the course catalog total pages is 2
    And the course ids are "course-005,course-001,course-004,course-007,course-011,course-012,course-008,course-006,course-003,course-010"

  Scenario: keyword search matches title, summary, and tags regardless of case
    When the client requests the course catalog at "/api/courses?q=SECURITY"
    Then the course catalog responds with status 200
    And every returned course matches keyword "security"
    And the course ids are "course-001,course-004,course-011,course-003,course-002"

  Scenario: modality filter returns only online courses
    When the client requests the course catalog at "/api/courses?modality=online"
    Then the course catalog responds with status 200
    And every returned course has modality "online"
    And the course ids are "course-005,course-001,course-004,course-008"

  Scenario: status filter returns only active courses
    When the client requests the course catalog at "/api/courses?status=active"
    Then the course catalog responds with status 200
    And every returned course has status "active"
    And the course ids are "course-005,course-001,course-007,course-011,course-002"

  Scenario: tag filter matches tags regardless of case
    When the client requests the course catalog at "/api/courses?tag=AI"
    Then the course catalog responds with status 200
    And every returned course has tag "ai"
    And the course ids are "course-005,course-001"

  Scenario: keyword, modality, and status filters combine
    When the client requests the course catalog at "/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 5
    And the course catalog total items is 1
    And the course catalog total pages is 1
    And the course ids are "course-001"

  Scenario: page and page size limit the result
    When the client requests the course catalog at "/api/courses?page=1&pageSize=5"
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 5
    And the course catalog item count is 5
    And the course catalog total items is 12
    And the course catalog total pages is 3
    And the course ids are "course-005,course-001,course-004,course-007,course-011"

  Scenario: createdAt sort orders the catalog
    When the client requests the course catalog at "/api/courses?sort=createdAt&pageSize=50"
    Then the course catalog responds with status 200
    And the course ids are "course-004,course-001,course-003,course-005,course-002,course-007,course-012,course-008,course-006,course-010,course-009,course-011"

  Scenario: an invalid modality returns 400
    When the client requests the course catalog at "/api/courses?modality=remote"
    Then the course catalog responds with status 400
    And the course catalog error code is "INVALID_QUERY_PARAMETER"
    And the course catalog error details include "modality" saying "modality must be one of online, in-person, hybrid."

  Scenario: an invalid status returns 400
    When the client requests the course catalog at "/api/courses?status=published"
    Then the course catalog responds with status 400
    And the course catalog error details include "status" saying "status must be one of draft, active, retired."

  Scenario: an invalid page returns 400
    When the client requests the course catalog at "/api/courses?page=0"
    Then the course catalog responds with status 400
    And the course catalog error details include "page" saying "page must be an integer greater than or equal to 1."

  Scenario: an invalid page size returns 400
    When the client requests the course catalog at "/api/courses?pageSize=51"
    Then the course catalog responds with status 400
    And the course catalog error code is "INVALID_QUERY_PARAMETER"
    And the course catalog error message is "One or more query parameters are invalid."
    And the course catalog error details include "pageSize" saying "pageSize must be between 1 and 50."

  Scenario: an invalid sort returns 400
    When the client requests the course catalog at "/api/courses?sort=popularity"
    Then the course catalog responds with status 400
    And the course catalog error details include "sort" saying "sort must be one of title, createdAt, updatedAt."

  Scenario: no matching courses return an empty page
    When the client requests the course catalog at "/api/courses?q=zzzz-no-such-course"
    Then the course catalog responds with status 200
    And the course catalog item count is 0
    And the course catalog page is 1
    And the course catalog page size is 10
    And the course catalog total items is 0
    And the course catalog total pages is 0

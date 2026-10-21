Feature: Course catalog search

  @A-AC1
  Scenario: A-AC1 returns the default page
    When the client requests "/api/courses"
    Then the response status is 200
    And the catalog page is 1
    And the catalog page size is 10
    And the catalog item count is 10
    And the catalog total items is at least 12

  @A-AC2
  Scenario: A-AC2 matches security regardless of case
    When the client requests "/api/courses?q=SeCuRiTy&pageSize=50"
    Then the response status is 200
    And every course matches keyword "security"

  @A-AC3
  Scenario: A-AC3 filters by online modality
    When the client requests "/api/courses?modality=online&pageSize=50"
    Then the response status is 200
    And every course has modality "online"

  @A-AC4
  Scenario: A-AC4 filters by active status
    When the client requests "/api/courses?status=active&pageSize=50"
    Then the response status is 200
    And every course has status "active"

  @A-AC5
  Scenario: A-AC5 filters by tag case-insensitively
    When the client requests "/api/courses?tag=AI&pageSize=50"
    Then the response status is 200
    And every course has tag "ai"

  @A-AC6
  Scenario: A-AC6 paginates
    When the client requests "/api/courses?page=1&pageSize=5"
    Then the response status is 200
    And the catalog page is 1
    And the catalog page size is 5
    And the catalog item count is at most 5
    And the catalog total pages matches the item total

  @A-AC7
  Scenario: A-AC7 sorts by createdAt
    When the client requests "/api/courses?sort=createdAt&pageSize=50"
    Then the response status is 200
    And courses are sorted by "createdAt"

  @A-AC8
  Scenario: A-AC8 reports every invalid param at once
    When the client requests "/api/courses?modality=nope&status=&page=0&pageSize=51&sort=rank"
    Then the response status is 400
    And the error code is "INVALID_QUERY_PARAMETER"
    And the error message is "One or more query parameters are invalid."
    And the error lists 5 details
    And the error details include field "modality"
    And the error details include field "status"
    And the error details include field "page"
    And the error details include field "pageSize"
    And the error details include field "sort"

  @A-AC9
  Scenario: A-AC9 returns an empty page when nothing matches
    When the client requests "/api/courses?q=zzzz-no-such-course"
    Then the response status is 200
    And the catalog item count is 0
    And the catalog total items is 0
    And the catalog total pages is 0

  @A-AC10
  Scenario: A-AC10 leaves the healthcheck working
    When the client requests the healthcheck
    Then the healthcheck responds with status 200

  @A-AC11
  Scenario: A-AC11 combines keyword modality and status
    When the client requests "/api/courses?q=security&modality=online&status=active&pageSize=50"
    Then the response status is 200
    And every course matches keyword "security"
    And every course has modality "online"
    And every course has status "active"

  @A-AC12
  Scenario: A-AC12 returns the documented catalog shape
    When the client requests "/api/courses?pageSize=1"
    Then the response status is 200
    And the catalog page has the documented fields

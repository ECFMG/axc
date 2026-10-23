Feature: Course search

  @A-AC1
  Scenario: A-AC1 returns the default paginated course list
    When the client requests "/api/courses"
    Then the response status is 200
    And the course page uses defaults

  @A-AC2
  Scenario: A-AC2 filters by keyword security regardless of case
    When the client requests "/api/courses?q=security"
    Then the response status is 200
    And every course matches keyword "security"

  @A-AC3
  Scenario: A-AC3 filters by online modality
    When the client requests "/api/courses?modality=online"
    Then the response status is 200
    And every course has modality "online"

  @A-AC4
  Scenario: A-AC4 filters by active status
    When the client requests "/api/courses?status=active"
    Then the response status is 200
    And every course has status "active"

  @A-AC5
  Scenario: A-AC5 filters by the ai tag
    When the client requests "/api/courses?tag=ai"
    Then the response status is 200
    And every course has tag "ai"

  @A-AC6
  Scenario: A-AC6 paginates with page and pageSize
    When the client requests "/api/courses?page=1&pageSize=5"
    Then the response status is 200
    And the course page has page 1 and pageSize 5

  @A-AC7
  Scenario: A-AC7 sorts by createdAt
    When the client requests "/api/courses?sort=createdAt"
    Then the response status is 200
    And courses are sorted by "createdAt"

  @A-AC8
  Scenario: A-AC8 reports every invalid query param at once
    When the client requests "/api/courses?modality=nope&status=nope&page=0&pageSize=51&sort=nope"
    Then the response status is 400
    And the error code is "INVALID_QUERY_PARAMETER"
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
    And the course page is empty

  @A-AC11
  Scenario: A-AC11 combines keyword modality and status filters
    When the client requests "/api/courses?q=security&modality=online&status=active"
    Then the response status is 200
    And every course matches keyword "security"
    And every course has modality "online"
    And every course has status "active"

  # ac-meta: A-AC10
  # ac-meta: A-AC12

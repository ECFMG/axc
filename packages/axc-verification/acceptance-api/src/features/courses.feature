Feature: Course catalog search

  # ac-meta: A-AC10
  # ac-meta: A-AC11
  # ac-meta: A-AC12

  @A-AC1
  Scenario: A-AC1 lists courses with default pagination
    When the client requests "/api/courses"
    Then the response status is 200
    And the course page uses default pagination

  @A-AC2
  Scenario: A-AC2 searches by keyword regardless of case
    When the client requests "/api/courses?q=security"
    Then the response status is 200
    And every course matches keyword "security"

  @A-AC3
  Scenario: A-AC3 filters by modality
    When the client requests "/api/courses?modality=online"
    Then the response status is 200
    And every course has modality "online"

  @A-AC4
  Scenario: A-AC4 filters by status
    When the client requests "/api/courses?status=active"
    Then the response status is 200
    And every course has status "active"

  @A-AC5
  Scenario: A-AC5 filters by tag
    When the client requests "/api/courses?tag=ai"
    Then the response status is 200
    And every course has tag "ai"

  @A-AC6
  Scenario: A-AC6 paginates with page and page size
    When the client requests "/api/courses?page=1&pageSize=5"
    Then the response status is 200
    And the course page respects page size 5

  @A-AC7
  Scenario: A-AC7 sorts by createdAt
    When the client requests "/api/courses?sort=createdAt"
    Then the response status is 200
    And the courses are sorted by createdAt

  @A-AC8
  Scenario: A-AC8 reports every invalid query parameter at once
    When the client requests "/api/courses?modality=nope&status=&page=0&pageSize=51&sort=nope"
    Then the response status is 400
    And the error details include "modality, status, page, pageSize, sort"

  @A-AC9
  Scenario: A-AC9 returns an empty page when nothing matches
    When the client requests "/api/courses?q=zzznomatchqqq"
    Then the response status is 200
    And the course page has no matches

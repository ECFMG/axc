Feature: Course catalog search

  @A-AC1
  Scenario: A-AC1 returns a paginated list of courses using default pagination
    When the client requests "/api/courses"
    Then the response status is 200
    And the catalog page is 1 with page size 10
    And the catalog contains 10 items

  @A-AC2
  Scenario: A-AC2 searches by keyword across title, summary, and tags
    When the client requests "/api/courses?q=SeCuRiTy"
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
    When the client requests "/api/courses?tag=AI"
    Then the response status is 200
    And every course has tag "ai"

  @A-AC6
  Scenario: A-AC6 paginates with page and pageSize
    When the client requests "/api/courses?page=1&pageSize=5"
    Then the response status is 200
    And the catalog page is 1 with page size 5
    And the catalog contains at most 5 items

  @A-AC7
  Scenario: A-AC7 sorts by createdAt
    When the client requests "/api/courses?sort=createdAt"
    Then the response status is 200
    And the courses are sorted by createdAt

  @A-AC8
  Scenario: A-AC8 reports every invalid param at once
    When the client requests "/api/courses?modality=postal&status=gone&page=0&pageSize=99&sort=popularity"
    Then the response status is 400
    And the error lists 5 details

  @A-AC9
  Scenario: A-AC9 returns an empty list when nothing matches
    When the client requests "/api/courses?q=no-such-course-zzzz"
    Then the response status is 200
    And the items list is empty
    And the catalog total items is 0

  # ac-meta: A-AC10
  # ac-meta: A-AC11
  # ac-meta: A-AC12

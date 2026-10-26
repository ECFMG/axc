Feature: Course catalog search

  Scenario: A-AC1 default list is paginated
    When the client requests "/api/courses"
    Then the response status is 200
    And the page is 1 with pageSize 10 and at most 10 items

  Scenario: A-AC2 keyword search is case-insensitive across title, summary and tags
    When the client requests "/api/courses?q=SECURITY"
    Then the response status is 200
    And every course mentions "security"

  Scenario: A-AC3 modality filter returns only online courses
    When the client requests "/api/courses?modality=online"
    Then every course has "modality" equal to "online"

  Scenario: A-AC4 status filter returns only active courses
    When the client requests "/api/courses?status=active"
    Then every course has "status" equal to "active"

  Scenario: A-AC5 tag filter returns courses tagged ai
    When the client requests "/api/courses?tag=AI"
    Then every course has the tag "ai"

  Scenario: A-AC6 pagination limits items and reports metadata
    When the client requests "/api/courses?page=1&pageSize=5"
    Then the page is 1 with pageSize 5 and at most 5 items

  Scenario: A-AC7 sort by createdAt
    When the client requests "/api/courses?sort=createdAt&pageSize=50"
    Then the courses are sorted by "createdAt"

  Scenario Outline: A-AC8 invalid query parameters return 400
    When the client requests "<path>"
    Then the response status is 400
    And the error reports field "<field>"

    Examples:
      | path                        | field    |
      | /api/courses?modality=remote | modality |
      | /api/courses?status=archived | status   |
      | /api/courses?page=0          | page     |
      | /api/courses?pageSize=51     | pageSize |
      | /api/courses?sort=price      | sort     |

  Scenario: A-AC9 no matches return 200 with empty items
    When the client requests "/api/courses?q=zzz-no-match"
    Then the response status is 200
    And the items are empty with totalItems 0

  Scenario: A-AC10 existing healthcheck still passes
    When the client requests the healthcheck
    Then the healthcheck responds with status 200

  Scenario: A-AC11 combined q, modality and status filters
    When the client requests "/api/courses?q=ai&modality=online&status=active"
    Then every course has "modality" equal to "online"
    And every course has "status" equal to "active"
    And every course mentions "ai"

  Scenario: A-AC12 documented error response shape
    When the client requests "/api/courses?pageSize=99"
    Then the response status is 400
    And the error code is "INVALID_QUERY_PARAMETER"

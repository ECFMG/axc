Feature: Course catalog search

  Scenario: A-AC1 default list is paginated
    When the client requests "/api/courses"
    Then the courses response status is 200
    And the page is 1 with pageSize 10 and 10 items of 12 total

  Scenario: A-AC2 keyword search is case-insensitive across title, summary and tags
    When the client requests "/api/courses?q=SECURITY"
    Then the courses response status is 200
    And the course ids are "course-001,course-005,course-009"

  Scenario: A-AC3 modality filter returns only online courses
    When the client requests "/api/courses?modality=online"
    Then every course has modality "online"

  Scenario: A-AC4 status filter returns only active courses
    When the client requests "/api/courses?status=active"
    Then every course has status "active"

  Scenario: A-AC5 tag filter matches the ai tag case-insensitively
    When the client requests "/api/courses?tag=ai"
    Then the course ids are "course-001,course-004,course-011"

  Scenario: A-AC6 page and pageSize limit items and include metadata
    When the client requests "/api/courses?page=1&pageSize=5"
    Then the page is 1 with pageSize 5 and 5 items of 12 total

  Scenario: A-AC7 sort by createdAt orders records by createdAt
    When the client requests "/api/courses?sort=createdAt&pageSize=50"
    Then the courses are sorted by "createdAt"

  Scenario Outline: A-AC8 invalid <field> returns 400
    When the client requests "/api/courses?<field>=<value>"
    Then the courses response status is 400
    And the error names field "<field>"

    Examples:
      | field    | value  |
      | modality | remote |
      | status   | gone   |
      | page     | 0      |
      | pageSize | 51     |
      | sort     | id     |

  Scenario: A-AC9 no matches return 200 with empty items
    When the client requests "/api/courses?q=nothing-matches-this"
    Then the courses response status is 200
    And the page is 1 with pageSize 10 and 0 items of 0 total

  Scenario: A-AC11 combined q, modality and status filters
    When the client requests "/api/courses?q=ai&modality=online&status=active"
    Then the course ids are "course-001,course-011"

  Scenario: A-AC12 documentation covers path, parameters, success and error responses
    Then the courses documentation mentions "GET /api/courses,pageSize,modality,sort,totalPages,INVALID_QUERY_PARAMETER"

  Scenario: A-AC10 existing healthcheck still passes alongside courses
    When the client requests the healthcheck
    Then the healthcheck responds with status 200
    And the healthcheck body matches the agentCourses contract

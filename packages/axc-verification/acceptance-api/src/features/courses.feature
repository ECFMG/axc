Feature: Course catalog search

  Scenario: A-AC1 default pagination returns the first page of the catalog
    When the client requests "/api/courses"
    Then the catalog responds with status 200
    And the catalog page is page 1, pageSize 10, totalItems 12, totalPages 2
    And the catalog returns 10 items

  Scenario: A-AC2 keyword search matches title, summary and tags regardless of case
    When the client requests "/api/courses?q=SeCuRiTy"
    Then the catalog responds with status 200
    And the catalog item ids are "course-001,course-004,course-009"

  Scenario: A-AC3 modality filter returns only online courses
    When the client requests "/api/courses?modality=online"
    Then the catalog responds with status 200
    And every catalog item has "modality" equal to "online"

  Scenario: A-AC4 status filter returns only active courses
    When the client requests "/api/courses?status=active"
    Then the catalog responds with status 200
    And every catalog item has "status" equal to "active"

  Scenario: A-AC5 tag filter returns courses carrying the tag
    When the client requests "/api/courses?tag=ai"
    Then the catalog responds with status 200
    And every catalog item carries the tag "ai"
    And the catalog item ids are "course-001,course-002,course-008"

  Scenario: A-AC6 page and pageSize cap the result and report metadata
    When the client requests "/api/courses?page=1&pageSize=5"
    Then the catalog responds with status 200
    And the catalog returns 5 items
    And the catalog page is page 1, pageSize 5, totalItems 12, totalPages 3

  Scenario: A-AC7 sort returns records ordered by createdAt
    When the client requests "/api/courses?sort=createdAt&pageSize=50"
    Then the catalog responds with status 200
    And the catalog items ascend by "createdAt"

  Scenario Outline: A-AC8 invalid query parameters return 400
    When the client requests "<path>"
    Then the catalog responds with status 400
    And the catalog error code is "INVALID_QUERY_PARAMETER" for field "<field>"

    Examples:
      | path                              | field    |
      | /api/courses?modality=telepathic  | modality |
      | /api/courses?status=archived      | status   |
      | /api/courses?page=0               | page     |
      | /api/courses?pageSize=51          | pageSize |
      | /api/courses?sort=price           | sort     |

  Scenario: A-AC9 no matches return 200 with an empty list
    When the client requests "/api/courses?q=quantum%20basket%20weaving"
    Then the catalog responds with status 200
    And the catalog returns 0 items
    And the catalog page is page 1, pageSize 10, totalItems 0, totalPages 0

  Scenario: A-AC10 the existing healthcheck route still responds
    When the client requests the healthcheck
    Then the healthcheck responds with status 200
    And the healthcheck body matches the agentCourses contract

  Scenario: A-AC11 combined keyword, modality and status filters
    When the client requests "/api/courses?q=ai&modality=online&status=active"
    Then the catalog responds with status 200
    And the catalog item ids are "course-001,course-002"
    And the catalog page is page 1, pageSize 10, totalItems 2, totalPages 1

  Scenario: A-AC12 the documented response envelope is returned
    When the client requests "/api/courses?pageSize=1"
    Then the catalog responds with status 200
    And the catalog body has the fields "items,page,pageSize,totalItems,totalPages"
    And every catalog item has the fields "id,title,summary,modality,status,tags,createdAt,updatedAt"

Feature: Course catalog search

  Scenario: A-AC1 default request returns the first page of courses sorted by title
    When the client requests "/api/courses"
    Then the catalog responds with status 200
    And the page metadata is page 1, pageSize 10, totalItems 14, totalPages 2
    And the response holds 10 items sorted by "title"

  Scenario: A-AC2 keyword search matches title, summary and tags regardless of case
    When the client requests "/api/courses?q=SeCuRiTy"
    Then the catalog responds with status 200
    And the item ids are "course-001,course-012,course-003,course-007"

  Scenario: A-AC3 modality filter returns only online courses
    When the client requests "/api/courses?modality=online&pageSize=50"
    Then the catalog responds with status 200
    And every item has "modality" equal to "online"

  Scenario: A-AC4 status filter returns only active courses
    When the client requests "/api/courses?status=active&pageSize=50"
    Then the catalog responds with status 200
    And every item has "status" equal to "active"

  Scenario: A-AC5 tag filter returns courses tagged ai regardless of case
    When the client requests "/api/courses?tag=ai"
    Then the catalog responds with status 200
    And the item ids are "course-001,course-008,course-002"

  Scenario: A-AC6 page and pageSize limit items and report pagination metadata
    When the client requests "/api/courses?page=1&pageSize=5"
    Then the catalog responds with status 200
    And the page metadata is page 1, pageSize 5, totalItems 14, totalPages 3
    And the response holds 5 items sorted by "title"

  Scenario: A-AC7 sort by createdAt orders records by createdAt
    When the client requests "/api/courses?sort=createdAt&pageSize=50"
    Then the catalog responds with status 200
    And the response holds 14 items sorted by "createdAt"

  Scenario Outline: A-AC8 invalid <field> returns 400 with the error contract
    When the client requests "/api/courses?<query>"
    Then the catalog responds with status 400
    And the error names the invalid field "<field>"

    Examples:
      | query             | field    |
      | modality=remote   | modality |
      | status=archived   | status   |
      | page=0            | page     |
      | pageSize=51       | pageSize |
      | sort=price        | sort     |

  Scenario: A-AC9 no matches returns 200 with an empty items array
    When the client requests "/api/courses?q=no-such-course"
    Then the catalog responds with status 200
    And the page metadata is page 1, pageSize 10, totalItems 0, totalPages 0
    And the response holds 0 items sorted by "title"

  Scenario: A-AC10 existing healthcheck still passes alongside the catalog
    When the client requests the healthcheck
    Then the healthcheck responds with status 200

  Scenario: A-AC11 combined q, modality and status filters narrow the result
    When the client requests "/api/courses?q=security&modality=online&status=active"
    Then the catalog responds with status 200
    And the item ids are "course-001"

  Scenario: A-AC12 documented example request returns the documented response shape
    When the client requests "/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
    Then the catalog responds with status 200
    And the page metadata is page 1, pageSize 5, totalItems 1, totalPages 1
    And the item ids are "course-001"

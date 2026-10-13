Feature: Course search

  Scenario: A-AC1 B-AC1 default request returns the first page of courses sorted by title
    When the client requests "/api/courses"
    Then the response status is 200
    And the course page has at most 10 items
    And the course page reports page 1, pageSize 10 and totalItems 12
    And the courses are sorted by title

  Scenario: A-AC2 keyword search matches title, summary and tags regardless of case
    When the client requests "/api/courses?q=SeCuRiTy&pageSize=50"
    Then the response status is 200
    And the course page reports page 1, pageSize 50 and totalItems 4
    And every course mentions "security" in title, summary or tags ignoring case

  Scenario: A-AC3 modality filter returns only online courses
    When the client requests "/api/courses?modality=online&pageSize=50"
    Then the response status is 200
    And every course has modality "online"

  Scenario: A-AC4 status filter returns only active courses
    When the client requests "/api/courses?status=active&pageSize=50"
    Then the response status is 200
    And every course has status "active"

  Scenario: A-AC5 tag filter returns courses containing the ai tag
    When the client requests "/api/courses?tag=ai"
    Then the response status is 200
    And the course page reports page 1, pageSize 10 and totalItems 3
    And every course has the tag "ai" ignoring case

  Scenario: A-AC6 page and pageSize limit items and report pagination metadata
    When the client requests "/api/courses?page=1&pageSize=5"
    Then the response status is 200
    And the course page has at most 5 items
    And the course page reports page 1, pageSize 5 and totalItems 12

  Scenario: A-AC7 sort by createdAt orders records by createdAt
    When the client requests "/api/courses?sort=createdAt&pageSize=50"
    Then the response status is 200
    And the courses are sorted by createdAt

  Scenario Outline: A-AC8 invalid <field> returns 400
    When the client requests "/api/courses?<query>"
    Then the response status is 400
    And the error code is "INVALID_QUERY_PARAMETER"
    And the error has a message and details for "<field>"

    Examples:
      | field    | query          |
      | modality | modality=space |
      | status   | status=paused  |
      | page     | page=0         |
      | pageSize | pageSize=51    |
      | sort     | sort=price     |

  Scenario: A-AC9 no matches returns 200 with an empty items array
    When the client requests "/api/courses?q=no-such-course"
    Then the response status is 200
    And the course page is empty
    And the course page reports page 1, pageSize 10 and totalItems 0

  Scenario: A-AC10 existing healthcheck still passes alongside course search
    When the client requests "/health"
    Then the response status is 200

  Scenario: A-AC11 combined q, modality and status filters
    When the client requests "/api/courses?q=security&modality=online&status=active"
    Then the response status is 200
    And every course has modality "online"
    And every course has status "active"
    And every course mentions "security" in title, summary or tags ignoring case

  Scenario: A-AC12 error response matches the documented contract
    When the client requests "/api/courses?pageSize=99"
    Then the response status is 400
    And the error code is "INVALID_QUERY_PARAMETER"
    And the error has a message and details for "pageSize"

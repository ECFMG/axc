Feature: Course catalog search

  The course search from Task Set A must keep working alongside the enrollment workflow.

  Scenario: B-AC1 browsing the catalog returns the first page
    When the client requests "/api/courses"
    Then the response status is 200
    And the response "page" is 1
    And the response "pageSize" is 10
    And the response "totalItems" is 14
    And the response "totalPages" is 2
    And the response "items" holds 10 entries

  Scenario: B-AC1 keyword, modality and status filters narrow the catalog
    When the client requests "/api/courses?q=security&modality=online&status=active"
    Then the response status is 200
    And the response "items" holds 2 entries
    And every response item "modality" is "online"
    And every response item "status" is "active"
    And the response "items.0.id" is "course-001"

  Scenario: B-AC1 the tag filter is case-insensitive and paginates
    When the client requests "/api/courses?tag=AI&page=1&pageSize=2"
    Then the response status is 200
    And the response "items" holds 2 entries
    And the response "totalItems" is 3
    And the response "totalPages" is 2

  Scenario: B-AC1 results can be sorted by createdAt
    When the client requests "/api/courses?sort=createdAt&pageSize=50"
    Then the response status is 200
    And the response items are sorted by "createdAt"

  Scenario: B-AC1 invalid query parameters are rejected with 400
    When the client requests "/api/courses?modality=telepathic&pageSize=500"
    Then the response status is 400
    And the response "error.code" is "INVALID_QUERY_PARAMETER"
    And the response "error.details" holds 2 entries

  Scenario: B-AC1 a search with no matches returns an empty page
    When the client requests "/api/courses?q=quidditch"
    Then the response status is 200
    And the response "items" holds 0 entries
    And the response "totalItems" is 0

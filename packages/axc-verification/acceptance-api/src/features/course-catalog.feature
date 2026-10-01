Feature: Course catalog search

  Scenario: GET /api/courses returns the first page with default pagination
    When the client searches the course catalog with ""
    Then the course search responds with status 200
    And the course page reports page 1 with page size 10
    And the course page contains 10 items

  Scenario: Combined keyword, modality and status filters narrow the result
    When the client searches the course catalog with "q=security&modality=online&status=active"
    Then the course search responds with status 200
    And the course page contains 1 items
    And the course page items all have modality "online"

  Scenario: Tag filter is case-insensitive
    When the client searches the course catalog with "tag=AI&sort=createdAt&pageSize=50"
    Then the course search responds with status 200
    And the course page contains 3 items

  Scenario: An invalid pageSize is rejected
    When the client searches the course catalog with "pageSize=500"
    Then the course search responds with status 400
    And the course error reports the invalid field "pageSize"

  Scenario: An invalid modality is rejected
    When the client searches the course catalog with "modality=remote"
    Then the course search responds with status 400
    And the course error reports the invalid field "modality"

  Scenario: A search with no matches returns an empty page
    When the client searches the course catalog with "q=underwater-basket-weaving"
    Then the course search responds with status 200
    And the course page contains 0 items

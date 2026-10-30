Feature: Course search

  Scenario: B-AC1 course search from Task Set A still works
    When the client sends GET "/api/courses"
    Then the response status is 200
    And the response "page" is "1"
    And the response "pageSize" is "10"
    When the client sends GET "/api/courses?q=SECURITY&modality=online&status=active"
    Then the response status is 200
    And every item has "modality" equal to "online"
    And every item has "status" equal to "active"
    When the client sends GET "/api/courses?tag=ai&sort=createdAt&page=1&pageSize=5"
    Then the response status is 200
    And the items are sorted by "createdAt"
    When the client sends GET "/api/courses?q=nothing-matches-this"
    Then the response "items" is "[]"
    And the response "totalItems" is "0"

  Scenario: B-AC1 invalid course search query parameters return 400
    When the client sends GET "/api/courses?pageSize=51"
    Then the response status is 400
    And the error code is "INVALID_QUERY_PARAMETER"
    When the client sends GET "/api/courses?modality=mail&sort=id&page=0"
    Then the response status is 400

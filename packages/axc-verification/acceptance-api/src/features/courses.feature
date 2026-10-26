Feature: Course search

  Scenario: B-AC1 course search from Task Set A still works
    When the client sends GET "/api/courses"
    Then the response status is 200
    And the response has 10 items of 12 in total

  Scenario: B-AC1 course search filters, sorts and pages
    When the client sends GET "/api/courses?q=SECURITY&modality=online&status=active&page=1&pageSize=5&sort=createdAt"
    Then the response status is 200
    And every item has "modality" equal to "online"
    And every item has "status" equal to "active"
    And the items are sorted by "createdAt"

  Scenario: B-AC1 course search with no matches returns an empty list
    When the client sends GET "/api/courses?q=no-such-course"
    Then the response status is 200
    And the response has 0 items of 0 in total

  Scenario: B-AC1 invalid course search parameters return 400
    When the client sends GET "/api/courses?pageSize=51&sort=price"
    Then the response status is 400
    And the error code is "INVALID_QUERY_PARAMETER"

Feature: Course catalog

  Scenario: List the seeded catalog through the Azure Functions route
    When the catalog client requests "/api/courses"
    Then the catalog response status is 200
    And the catalog response contains 10 items and 12 total matches

  Scenario: Combine search and filters through the Azure Functions route
    When the catalog client requests "/api/courses?q=SECURITY&modality=online&status=active&tag=AI&pageSize=5"
    Then the catalog response status is 200
    And the catalog response contains 1 items and 1 total matches

  Scenario: Reject invalid pagination through the Azure Functions route
    When the catalog client requests "/api/courses?pageSize=51"
    Then the catalog response status is 400
    And the catalog response reports an invalid query parameter

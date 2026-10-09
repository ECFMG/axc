Feature: Course catalog search
  The sample API exposes a searchable training catalog.

  Scenario Outline: Catalog requests use the composed API route
    When the client requests catalog path "<path>"
    Then the catalog responds with status <status>
    And the catalog response has <count> items and <total> total matches

    Examples:
      | path                                                                         | status | count | total |
      | /api/courses                                                                 | 200    | 10    | 12    |
      | /api/courses?q=SECURITY&modality=online&status=active&tag=AI&pageSize=5          | 200    | 1     | 1     |
      | /api/courses?modality=hybrid&status=draft&tag=data                              | 200    | 1     | 1     |
      | /api/courses?page=3&pageSize=5                                                | 200    | 2     | 12    |
      | /api/courses?q=does-not-exist                                                 | 200    | 0     | 0     |

  Scenario: Invalid catalog parameters
    When the client requests catalog path "/api/courses?pageSize=51"
    Then the catalog responds with status 400
    And the catalog response contains a query validation error

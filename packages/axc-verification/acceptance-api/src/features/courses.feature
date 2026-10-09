Feature: Course catalog search
  Scenario Outline: Catalog queries return paginated fixture data
    When the client requests courses with query "<query>"
    Then the courses respond with status 200
    And the courses contain <items> items with <total> total matches on page <page> of size <size>

    Examples:
      | query                                       | items | total | page | size |
      |                                             | 10    | 12    | 1    | 10   |
      | q=SECURITY&modality=online&status=active      | 1     | 1     | 1    | 10   |
      | tag=AI&status=active                        | 3     | 3     | 1    | 10   |
      | page=3&pageSize=5&sort=createdAt             | 2     | 12    | 3    | 5    |
      | q=nonexistent                              | 0     | 0     | 1    | 10   |

  Scenario: Invalid catalog pagination
    When the client requests courses with query "pageSize=51"
    Then the courses respond with status 400
    And the courses return an invalid query error

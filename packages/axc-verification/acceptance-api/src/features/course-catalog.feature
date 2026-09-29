Feature: Course catalog search

  Scenario: The catalog is returned with default pagination
    When the client requests the course catalog with ""
    Then the catalog responds with status 200
    And the catalog page is 1 with page size 10
    And the catalog returns at most 10 items
    And the catalog reports at least 12 total items

  Scenario: Results can be narrowed by keyword, modality and status
    When the client requests the course catalog with "?q=security&modality=online&status=active"
    Then the catalog responds with status 200
    And every returned course has modality "online"
    And every returned course has status "active"

  Scenario: Results can be narrowed by tag regardless of case
    When the client requests the course catalog with "?tag=AI&pageSize=50"
    Then the catalog responds with status 200
    And every returned course is tagged "ai"

  Scenario: A page size can be requested
    When the client requests the course catalog with "?page=1&pageSize=5"
    Then the catalog responds with status 200
    And the catalog page is 1 with page size 5
    And the catalog returns at most 5 items

  Scenario: Results can be sorted by creation date
    When the client requests the course catalog with "?sort=createdAt&pageSize=50"
    Then the catalog responds with status 200
    And the returned courses are ordered by createdAt

  Scenario: A query that matches nothing is not an error
    When the client requests the course catalog with "?q=definitely-not-in-the-catalog"
    Then the catalog responds with status 200
    And the catalog returns 0 total items

  Scenario Outline: Invalid query parameters are rejected
    When the client requests the course catalog with "<query>"
    Then the catalog responds with status 400
    And the catalog error names the field "<field>"

    Examples:
      | query               | field    |
      | ?modality=remote    | modality |
      | ?status=archived    | status   |
      | ?sort=rating        | sort     |
      | ?page=0             | page     |
      | ?pageSize=51        | pageSize |

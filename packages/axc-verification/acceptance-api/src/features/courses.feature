Feature: Course catalog search

  Scenario: Default list is paginated
    When the client requests the course catalog
    Then the course catalog responds with status 200
    And the course catalog uses default pagination
    And every catalog course has the required fields
    And the returned courses are sorted by title

  Scenario: Keyword search is case-insensitive across title, summary, and tags
    When the client requests the course catalog with:
      | q | SECURITY |
    Then the course catalog responds with status 200
    And every returned course matches keyword "security" in title, summary, or tags
    And the catalog includes a title match, a summary match, and a tag match for "security"

  Scenario: Filter by modality
    When the client requests the course catalog with:
      | modality | online |
    Then the course catalog responds with status 200
    And every returned course has modality "online"

  Scenario: Filter by status
    When the client requests the course catalog with:
      | status | active |
    Then the course catalog responds with status 200
    And every returned course has status "active"

  Scenario: Filter by tag is case-insensitive
    When the client requests the course catalog with:
      | tag | AI |
    Then the course catalog responds with status 200
    And every returned course contains tag "ai"

  Scenario: Combined keyword, modality, and status filters
    When the client requests the course catalog with:
      | q        | security |
      | modality | online   |
      | status   | active   |
    Then the course catalog responds with status 200
    And every returned course matches keyword "security" in title, summary, or tags
    And every returned course has modality "online"
    And every returned course has status "active"

  Scenario: Pagination returns a page of results
    When the client requests the course catalog with:
      | page     | 1 |
      | pageSize | 5 |
    Then the course catalog responds with status 200
    And the course catalog page has at most 5 items
    And the course catalog pagination metadata matches page 1 and page size 5

  Scenario: Sort by createdAt
    When the client requests the course catalog with:
      | sort     | createdAt |
      | pageSize | 50        |
    Then the course catalog responds with status 200
    And the returned courses are sorted by createdAt

  Scenario: Invalid modality is rejected
    When the client requests the course catalog with:
      | modality | correspondence |
    Then the course catalog responds with status 400
    And the course catalog error is INVALID_QUERY_PARAMETER for "modality"

  Scenario: Invalid status is rejected
    When the client requests the course catalog with:
      | status | archived |
    Then the course catalog responds with status 400
    And the course catalog error is INVALID_QUERY_PARAMETER for "status"

  Scenario: Invalid page is rejected
    When the client requests the course catalog with:
      | page | 0 |
    Then the course catalog responds with status 400
    And the course catalog error is INVALID_QUERY_PARAMETER for "page"

  Scenario: Invalid pageSize is rejected
    When the client requests the course catalog with:
      | pageSize | 51 |
    Then the course catalog responds with status 400
    And the course catalog error is INVALID_QUERY_PARAMETER for "pageSize"

  Scenario: Invalid sort is rejected
    When the client requests the course catalog with:
      | sort | popularity |
    Then the course catalog responds with status 400
    And the course catalog error is INVALID_QUERY_PARAMETER for "sort"

  Scenario: No matches return an empty page
    When the client requests the course catalog with:
      | q | zzz-no-such-course |
    Then the course catalog responds with status 200
    And the course catalog items list is empty
    And the course catalog pagination metadata is valid for no matches

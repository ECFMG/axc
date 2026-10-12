Feature: Course catalog search

  Learners browse the training catalog and narrow it down with keyword search,
  filters, pagination, and sorting.

  Scenario: Browsing the catalog returns the first page
    When the client searches the course catalog with ""
    Then the API responds with status 200
    And the catalog response reports a page size of 10
    And the catalog response contains at most 10 courses

  Scenario: Searching for an active online security course
    When the client searches the course catalog with "q=security&modality=online&status=active"
    Then the API responds with status 200
    And the catalog response contains course "course-001"

  Scenario: Filtering by tag is case-insensitive
    When the client searches the course catalog with "tag=AI&pageSize=50"
    Then the API responds with status 200
    And the catalog response contains course "course-001"

  Scenario: A search with no matches returns an empty page
    When the client searches the course catalog with "q=underwater-basket-weaving"
    Then the API responds with status 200
    And the catalog response reports 0 total items
    And the catalog response contains at most 0 courses

  Scenario: An unsupported page size is rejected
    When the client searches the course catalog with "pageSize=500"
    Then the API responds with status 400
    And the API responds with error code "INVALID_QUERY_PARAMETER"

  Scenario: An unsupported modality is rejected
    When the client searches the course catalog with "modality=remote"
    Then the API responds with status 400
    And the API responds with error code "INVALID_QUERY_PARAMETER"

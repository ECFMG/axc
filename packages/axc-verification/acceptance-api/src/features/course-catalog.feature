Feature: Course catalog search

  The training course catalog is searchable over HTTP at GET /api/courses.
  Callers filter by keyword, modality, status, and tag, and page and sort the results.

  Scenario: The catalog returns a default page of courses
    When the client searches the course catalog with ""
    Then the catalog responds with status 200
    And the catalog returns 10 items
    And the catalog reports page 1 with page size 10
    And the catalog items are ordered ascending by "title"

  Scenario: Keyword search matches title, summary, and tags regardless of case
    When the client searches the course catalog with "q=SeCuRiTy&pageSize=50"
    Then the catalog responds with status 200
    And the catalog includes the courses "course-001, course-010, course-014"

  Scenario: The catalog filters by modality
    When the client searches the course catalog with "modality=online&pageSize=50"
    Then the catalog responds with status 200
    And every returned course has "modality" equal to "online"

  Scenario: The catalog filters by status
    When the client searches the course catalog with "status=active&pageSize=50"
    Then the catalog responds with status 200
    And every returned course has "status" equal to "active"

  Scenario: The catalog filters by tag regardless of case
    When the client searches the course catalog with "tag=SECURITY&pageSize=50"
    Then the catalog responds with status 200
    And every returned course carries the tag "security"

  Scenario: The catalog combines keyword, modality, and status filters
    When the client searches the course catalog with "q=security&modality=online&status=active"
    Then the catalog responds with status 200
    And the catalog returns exactly the courses "course-001"

  Scenario: The catalog pages through results
    When the client searches the course catalog with "page=2&pageSize=5"
    Then the catalog responds with status 200
    And the catalog returns 5 items
    And the catalog reports page 2 with page size 5

  Scenario: The catalog sorts by createdAt
    When the client searches the course catalog with "sort=createdAt&pageSize=50"
    Then the catalog responds with status 200
    And the catalog items are ordered ascending by "createdAt"

  Scenario: The catalog rejects an out-of-range page size
    When the client searches the course catalog with "pageSize=100"
    Then the catalog responds with status 400
    And the catalog reports the invalid query parameters "pageSize"

  Scenario: The catalog rejects every unsupported filter value at once
    When the client searches the course catalog with "modality=remote&status=archived&sort=summary&page=0"
    Then the catalog responds with status 400
    And the catalog reports the invalid query parameters "modality, status, sort, page"

  Scenario: The catalog returns an empty page when nothing matches
    When the client searches the course catalog with "q=underwater-basket-weaving"
    Then the catalog responds with status 200
    And the catalog returns 0 items
    And the catalog reports 0 total items and 0 total pages

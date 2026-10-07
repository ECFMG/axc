Feature: Course catalog search

  The training catalog is searchable over HTTP through the application composed by @apps/api.

  Scenario: GET /api/courses returns the first page with default pagination
    When the client searches the course catalog with ""
    Then the course search responds with status 200
    And the course search reports page 1 of size 10 with 14 courses across 2 pages
    And the course search returns 10 courses
    And every returned course matches the agentCourses course contract

  Scenario: Keyword search matches the title, the summary, or a tag
    When the client searches the course catalog with "q=security"
    Then the course search responds with status 200
    And the course search returns 4 courses
    And every returned course matches the keyword "security"

  Scenario: Keyword search ignores case
    When the client searches the course catalog with "q=SECURITY"
    Then the course search responds with status 200
    And the course search returns 4 courses
    And every returned course matches the keyword "security"

  Scenario: Modality filter returns only that modality
    When the client searches the course catalog with "modality=online"
    Then the course search responds with status 200
    And the course search returns 6 courses
    And every returned course has modality "online"

  Scenario: Status filter returns only that status
    When the client searches the course catalog with "status=active"
    Then the course search responds with status 200
    And the course search returns 8 courses
    And every returned course has status "active"

  Scenario: Tag filter ignores case
    When the client searches the course catalog with "tag=AI"
    Then the course search responds with status 200
    And the course search returns 3 courses
    And every returned course has the tag "ai"

  Scenario: Keyword, modality, and status filters combine
    When the client searches the course catalog with "q=security&modality=online&status=active"
    Then the course search responds with status 200
    And the course search returns 1 courses
    And the first returned course is titled "AI Security Foundations"

  Scenario: Pagination returns the requested page and reports the totals
    When the client searches the course catalog with "page=2&pageSize=5"
    Then the course search responds with status 200
    And the course search reports page 2 of size 5 with 14 courses across 3 pages
    And the course search returns 5 courses

  Scenario Outline: Results are sorted ascending by the requested field
    When the client searches the course catalog with "sort=<field>&pageSize=50"
    Then the course search responds with status 200
    And the returned courses are sorted ascending by "<field>"
    And the first returned course is titled "<first>"

    Examples:
      | field     | first                        |
      | title     | Accessible Frontend Patterns |
      | createdAt | Retired Legacy Migration Clinic |
      | updatedAt | Retired Legacy Migration Clinic |

  Scenario: A search with no matches returns an empty list, not an error
    When the client searches the course catalog with "q=quantum%20basket%20weaving"
    Then the course search responds with status 200
    And the course search reports page 1 of size 10 with 0 courses across 0 pages
    And the course search returns 0 courses

  Scenario Outline: Invalid query parameters are rejected
    When the client searches the course catalog with "<query>"
    Then the course search responds with status 400
    And the course search reports "INVALID_QUERY_PARAMETER" for field "<field>"

    Examples:
      | query            | field    |
      | modality=remote  | modality |
      | status=archived  | status   |
      | sort=summary     | sort     |
      | page=0           | page     |
      | page=abc         | page     |
      | pageSize=0       | pageSize |
      | pageSize=51      | pageSize |

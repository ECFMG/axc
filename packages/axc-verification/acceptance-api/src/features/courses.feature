Feature: Course catalog search
  Learners search the seeded course catalog with GET /api/courses (Task Set A behavior, preserved by Task Set B).

  @B-AC1
  Scenario: The catalog is listed with default pagination
    When the client searches courses with ""
    Then the response status is 200
    And the course page is page 1 with page size 10
    And the course page has at most 10 items
    And the course page reports at least 12 total items

  @B-AC1
  Scenario: Keyword search matches title, summary, or tags regardless of case
    When the client searches courses with "q=SECURITY"
    Then the response status is 200
    And every course mentions "security" in its title, summary, or tags
    And the course titles include "Threat Modeling for Teams"

  @B-AC1
  Scenario Outline: Filters return only matching courses
    When the client searches courses with "<query>"
    Then the response status is 200
    And the course page has at least 1 item
    And every course has <field> "<value>"

    Examples:
      | query                                  | field    | value  |
      | modality=online                        | modality | online |
      | status=active                          | status   | active |
      | tag=AI                                 | tag      | ai     |
      | q=security&modality=online&status=active | modality | online |
      | q=security&modality=online&status=active | status   | active |

  @B-AC1
  Scenario: Pagination limits the page size and reports metadata
    When the client searches courses with "page=2&pageSize=5"
    Then the response status is 200
    And the course page is page 2 with page size 5
    And the course page has at most 5 items
    And the course page reports total pages for page size 5

  @B-AC1
  Scenario: Sorting by createdAt orders the results
    When the client searches courses with "sort=createdAt&pageSize=50"
    Then the response status is 200
    And the courses are sorted by "createdAt"

  @B-AC1
  Scenario: No matching courses is an empty page, not an error
    When the client searches courses with "q=no-such-course-keyword"
    Then the response status is 200
    And the course page has 0 items
    And the course page reports 0 total items

  @B-AC1
  Scenario Outline: Invalid query parameters return 400
    When the client searches courses with "<query>"
    Then the response status is 400
    And the error code is "INVALID_QUERY_PARAMETER"
    And the error details name the field "<field>"

    Examples:
      | query           | field    |
      | modality=remote | modality |
      | status=open     | status   |
      | page=0          | page     |
      | pageSize=51     | pageSize |
      | sort=price      | sort     |

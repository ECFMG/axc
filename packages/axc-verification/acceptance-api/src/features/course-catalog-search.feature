Feature: Course catalog search

  Users search the training course catalog over HTTP and narrow the results
  with keyword, modality, status, and tag filters.

  Scenario: Default pagination
    When the client requests courses with ""
    Then the courses response status is 200
    And the courses response reports page 1 with page size 10
    And the courses response contains at most 10 items
    And the courses response is ordered by "title"

  Scenario: Keyword search is case-insensitive across title, summary, and tags
    When the client requests courses with "?q=SECURITY&pageSize=50"
    Then the courses response status is 200
    And the courses response is not empty
    And every returned course matches the keyword "security"

  Scenario Outline: Enum filters return only matching courses
    When the client requests courses with "?<parameter>=<value>&pageSize=50"
    Then the courses response status is 200
    And the courses response is not empty
    And every returned course has "<parameter>" equal to "<value>"

    Examples:
      | parameter | value     |
      | modality  | online    |
      | modality  | in-person |
      | modality  | hybrid    |
      | status    | draft     |
      | status    | active    |
      | status    | retired   |

  Scenario: Tag filter is case-insensitive
    When the client requests courses with "?tag=AI&pageSize=50"
    Then the courses response status is 200
    And the courses response is not empty
    And every returned course carries the tag "ai"

  Scenario: Combined keyword, modality, and status filters
    When the client requests courses with "?q=ai&modality=online&status=active"
    Then the courses response status is 200
    And the courses response contains exactly the course ids "course-001,course-002"

  Scenario: Pagination caps the page and reports totals
    When the client requests courses with "?page=1&pageSize=5"
    Then the courses response status is 200
    And the courses response reports page 1 with page size 5
    And the courses response contains at most 5 items
    And the courses response reports 14 total items across 3 pages

  Scenario: Sorting by createdAt
    When the client requests courses with "?sort=createdAt&pageSize=50"
    Then the courses response status is 200
    And the courses response is ordered by "createdAt"

  Scenario Outline: Invalid query parameters are rejected
    When the client requests courses with "?<query>"
    Then the courses response status is 400
    And the courses error response reports "<field>" as invalid

    Examples:
      | query              | field    |
      | modality=virtual   | modality |
      | status=archived    | status   |
      | sort=relevance     | sort     |
      | page=0             | page     |
      | pageSize=51        | pageSize |

  Scenario: No matching results return an empty page rather than an error
    When the client requests courses with "?q=underwater%20basket%20weaving"
    Then the courses response status is 200
    And the courses response contains at most 0 items
    And the courses response reports 0 total items across 0 pages

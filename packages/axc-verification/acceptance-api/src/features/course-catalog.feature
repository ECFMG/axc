Feature: Course catalog search

  Scenario: List courses with default pagination
    When the client requests the course catalog
    Then the course catalog responds with status 200
    And the course catalog metadata is page 1, page size 10, 12 total items, and 2 total pages
    And the course catalog contains at most 10 items

  Scenario: Search all keyword fields case-insensitively
    When the client requests courses with query "q=SeCuRiTy&pageSize=50"
    Then the course catalog responds with status 200
    And the returned course IDs are "course-001,course-004,course-007,course-011"

  Scenario Outline: Filter courses by supported fields
    When the client requests courses with query "<query>"
    Then the course catalog responds with status 200
    And every returned course has <field> "<value>"

    Examples:
      | query              | field    | value     |
      | modality=online    | modality | online    |
      | status=retired     | status   | retired   |

  Scenario: Filter tags case-insensitively
    When the client requests courses with query "tag=AI"
    Then the course catalog responds with status 200
    And the returned course IDs are "course-001,course-008"

  Scenario: Combine keyword, modality, and status filters
    When the client requests courses with query "q=security&modality=online&status=active"
    Then the course catalog responds with status 200
    And the returned course IDs are "course-001,course-004"

  Scenario: Paginate courses sorted by creation date
    When the client requests courses with query "page=2&pageSize=5&sort=createdAt"
    Then the course catalog responds with status 200
    And the course catalog metadata is page 2, page size 5, 12 total items, and 3 total pages
    And the course catalog contains at most 5 items
    And the returned courses are sorted by createdAt

  Scenario Outline: Reject invalid query parameters consistently
    When the client requests courses with query "<query>"
    Then the course catalog responds with status 400
    And the invalid query response identifies "<field>"

    Examples:
      | query               | field    |
      | modality=virtual    | modality |
      | status=published    | status   |
      | page=0              | page     |
      | pageSize=51         | pageSize |
      | sort=relevance      | sort     |
      | unsupported=value   | unsupported |

  Scenario: Return an empty page when no courses match
    When the client requests courses with query "q=no-such-course"
    Then the course catalog responds with status 200
    And the course catalog metadata is page 1, page size 10, 0 total items, and 0 total pages
    And the course catalog contains at most 0 items

Feature: Course catalog search
  Scenario: Default paginated catalog
    When the client searches courses at "/api/courses"
    Then the course response status is 200
    And the default course catalog is paginated

  Scenario: Keyword search across title summary and tags
    When the client searches courses at "/api/courses?q=sEcUrItY"
    Then the course response status is 200
    And the course ids are "course-001,course-003,course-008,course-010"

  Scenario Outline: Individual filters
    When the client searches courses at "/api/courses?<query>"
    Then the course response status is 200
    And all courses match "<field>" with "<value>"
    Examples:
      | query               | field    | value     |
      | modality=online     | modality | online    |
      | modality=in-person  | modality | in-person |
      | modality=hybrid     | modality | hybrid    |
      | status=active       | status   | active    |
      | status=draft        | status   | draft     |
      | status=retired      | status   | retired   |
      | tag=aI              | tag      | ai        |

  Scenario: Combined keyword modality and status
    When the client searches courses at "/api/courses?q=security&modality=online&status=active"
    Then the course response status is 200
    And the course ids are "course-001,course-003"

  Scenario: Combined tag modality and status
    When the client searches courses at "/api/courses?tag=AI&modality=hybrid&status=active"
    Then the course response status is 200
    And the course ids are "course-007,course-010"

  Scenario: Page size and second page
    When the client searches courses at "/api/courses?page=2&pageSize=5"
    Then the course response status is 200
    And the course page is 2 with size 5 total 12 and pages 3
    And the course ids are "course-003,course-008,course-006,course-007,course-005"

  Scenario Outline: Sort fields
    When the client searches courses at "/api/courses?sort=<field>&pageSize=50"
    Then the course response status is 200
    And the courses are sorted by "<field>"
    Examples:
      | field     |
      | title     |
      | createdAt |
      | updatedAt |

  Scenario Outline: Invalid query parameters
    When the client searches courses at "/api/courses?<query>"
    Then the course response status is 400
    And the course error identifies "<field>"
    Examples:
      | query              | field    |
      | modality=remote    | modality |
      | status=published   | status   |
      | page=0             | page     |
      | page=1.5           | page     |
      | page=abc           | page     |
      | pageSize=51        | pageSize |
      | pageSize=0         | pageSize |
      | sort=summary       | sort     |
      | page=1&page=2      | page     |
      | extra=value        | extra    |

  Scenario: No matching courses
    When the client searches courses at "/api/courses?q=unfindable-course"
    Then the course response status is 200
    And the course page is 1 with size 10 total 0 and pages 0
    And the course ids are ""

  Scenario: Page beyond the catalog
    When the client searches courses at "/api/courses?page=99"
    Then the course response status is 200
    And the course page is 99 with size 10 total 12 and pages 2
    And the course ids are ""

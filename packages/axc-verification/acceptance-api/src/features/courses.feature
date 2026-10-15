Feature: Course catalog search

  Scenario: Default course list
    When the catalog client requests "/api/courses"
    Then the catalog status is 200
    And the catalog page is 1 with size 10 and total 12
    And the catalog contains 10 items
    And the catalog is sorted by "title"
    And catalog courses have all required fields

  Scenario Outline: Keyword matches title, summary and tags ignoring case
    When the catalog client requests "/api/courses?q=<keyword>"
    Then the catalog status is 200
    And the catalog course IDs are "course-001,course-003,course-007"
    Examples:
      | keyword  |
      | security |
      | SECURITY |

  Scenario Outline: Modality filter
    When the catalog client requests "/api/courses?modality=<value>"
    Then the catalog status is 200
    And every catalog course has "modality" equal to "<value>"
    Examples:
      | value     |
      | online    |
      | in-person |
      | hybrid    |

  Scenario Outline: Status filter
    When the catalog client requests "/api/courses?status=<value>"
    Then the catalog status is 200
    And every catalog course has "status" equal to "<value>"
    Examples:
      | value   |
      | draft   |
      | active  |
      | retired |

  Scenario: Case insensitive tag filter
    When the catalog client requests "/api/courses?tag=AI"
    Then the catalog status is 200
    And the catalog course IDs are "course-001,course-006,course-009"

  Scenario: Keyword, modality and status combination
    When the catalog client requests "/api/courses?q=security&modality=online&status=active"
    Then the catalog status is 200
    And the catalog course IDs are "course-001,course-007"

  Scenario: Tag and status combination
    When the catalog client requests "/api/courses?tag=ai&status=draft"
    Then the catalog status is 200
    And the catalog course IDs are "course-006"

  Scenario: First page of five
    When the catalog client requests "/api/courses?page=1&pageSize=5"
    Then the catalog status is 200
    And the catalog page is 1 with size 5 and total 12
    And the catalog course IDs are "course-001,course-002,course-004,course-003,course-005"

  Scenario: Last partial page
    When the catalog client requests "/api/courses?page=3&pageSize=5"
    Then the catalog status is 200
    And the catalog page is 3 with size 5 and total 12
    And the catalog course IDs are "course-011,course-012"

  Scenario Outline: Ascending sorting
    When the catalog client requests "/api/courses?sort=<field>&pageSize=50"
    Then the catalog status is 200
    And the catalog contains 12 items
    And the catalog is sorted by "<field>"
    Examples:
      | field     |
      | title     |
      | createdAt |
      | updatedAt |

  Scenario Outline: Invalid queries share the error contract
    When the catalog client requests "/api/courses?<query>"
    Then the catalog status is 400
    And the catalog error identifies "<field>"
    Examples:
      | query                | field    |
      | modality=remote      | modality |
      | status=unknown       | status   |
      | page=0               | page     |
      | page=1.5             | page     |
      | page=1e2             | page     |
      | pageSize=0           | pageSize |
      | pageSize=51          | pageSize |
      | sort=descending      | sort     |
      | unknown=x            | unknown  |
      | page=1&page=2        | page     |

  Scenario: No matching courses
    When the catalog client requests "/api/courses?q=nonexistent"
    Then the catalog status is 200
    And the catalog page is 1 with size 10 and total 0
    And the catalog contains 0 items

  Scenario: Page beyond the catalog
    When the catalog client requests "/api/courses?page=99"
    Then the catalog status is 200
    And the catalog page is 99 with size 10 and total 12
    And the catalog contains 0 items

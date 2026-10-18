Feature: Course catalog search

  Scenario: A-AC1 default course list
    When the client requests courses at "/api/courses"
    Then the courses response status is 200
    And the catalog metadata is page 1, size 10, total 12, pages 2, items 10
    And the catalog is sorted by "title"

  Scenario: A-AC2 keyword matches title summary and tags regardless of case
    When the client requests courses at "/api/courses?q=SeCuRiTy"
    Then the courses response status is 200
    And the catalog course ids are "course-001,course-002,course-003"

  Scenario: A-AC3 online modality
    When the client requests courses at "/api/courses?modality=online"
    Then the courses response status is 200
    And the catalog course ids are "course-004,course-001,course-002,course-007,course-011"

  Scenario: A-AC4 active status
    When the client requests courses at "/api/courses?status=active"
    Then the courses response status is 200
    And the catalog course ids are "course-001,course-005,course-002,course-006,course-009,course-011"

  Scenario: A-AC5 case insensitive exact tag
    When the client requests courses at "/api/courses?tag=AI"
    Then the courses response status is 200
    And the catalog course ids are "course-004,course-001,course-009"

  Scenario: A-AC6 custom pagination
    When the client requests courses at "/api/courses?page=1&pageSize=5"
    Then the courses response status is 200
    And the catalog metadata is page 1, size 5, total 12, pages 3, items 5

  Scenario Outline: A-AC7 sorting
    When the client requests courses at "/api/courses?sort=<sort>&pageSize=50"
    Then the courses response status is 200
    And the catalog metadata is page 1, size 50, total 12, pages 1, items 12
    And the catalog is sorted by "<sort>"
    Examples:
      | sort      |
      | title     |
      | createdAt |
      | updatedAt |

  Scenario Outline: A-AC8 invalid query parameters
    When the client requests courses at "/api/courses?<field>=<value>"
    Then the courses response status is 400
    And the catalog error identifies "<field>"
    Examples:
      | field    | value                |
      | modality | remote               |
      | status   | published            |
      | page     | 0                    |
      | page     | 99999999999999999999 |
      | pageSize | 51                   |
      | sort     | id                   |

  Scenario: A-AC9 no matching results
    When the client requests courses at "/api/courses?q=missing-course"
    Then the courses response status is 200
    And the catalog metadata is page 1, size 10, total 0, pages 0, items 0

  Scenario Outline: A-AC11 combined filters
    When the client requests courses at "/api/courses?<query>"
    Then the courses response status is 200
    And the catalog course ids are "<ids>"
    Examples:
      | query                                     | ids                   |
      | q=security&modality=online&status=active    | course-001,course-002 |
      | modality=hybrid&status=active&tag=ai        | course-009            |

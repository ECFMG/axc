Feature: Course catalog search

  Scenario: GET /api/courses returns the default page sorted by title
    When the client requests the course catalog
    Then the course catalog responds with status 200
    And the course page metadata is page 1, page size 10, total items 12, and total pages 2
    And the course ids are "course-001,course-002,course-003,course-004,course-005,course-006,course-007,course-008,course-009,course-010"

  Scenario: keyword search matches title, summary, and tags regardless of case
    When the client requests the course catalog with "q=SECURITY"
    Then the course catalog responds with status 200
    And the course ids are "course-001,course-002,course-003,course-008,course-011,course-012"
    And every course matches keyword "security"

  Scenario: modality, status, and tag filters limit the catalog
    When the client requests the course catalog with "modality=online"
    Then the course catalog responds with status 200
    And the course ids are "course-001,course-002,course-008,course-009,course-010"
    And every course modality is "online"
    When the client requests the course catalog with "status=active"
    Then the course ids are "course-001,course-004,course-005,course-006,course-009,course-011"
    And every course status is "active"
    When the client requests the course catalog with "tag=AI"
    Then the course ids are "course-001,course-005"
    And every course includes tag "ai"

  Scenario: keyword, modality, and status filters combine
    When the client requests the course catalog with "q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
    Then the course catalog responds with status 200
    And the course page metadata is page 1, page size 5, total items 1, and total pages 1
    And the first course json is
      """
      {"id":"course-001","title":"AI Security Foundations","summary":"Introductory course on secure AI-assisted development.","modality":"online","status":"active","tags":["ai","security"],"createdAt":"2026-01-15T00:00:00.000Z","updatedAt":"2026-06-01T00:00:00.000Z"}
      """

  Scenario: page and page size select a slice of the sorted catalog
    When the client requests the course catalog with "page=2&pageSize=5"
    Then the course catalog responds with status 200
    And the course page metadata is page 2, page size 5, total items 12, and total pages 3
    And the course ids are "course-006,course-007,course-008,course-009,course-010"

  Scenario: sort=createdAt orders courses by createdAt ascending
    When the client requests the course catalog with "sort=createdAt&pageSize=50"
    Then the course catalog responds with status 200
    And the course ids are "course-010,course-007,course-001,course-004,course-002,course-011,course-003,course-009,course-005,course-006,course-008,course-012"

  Scenario Outline: invalid query parameters return 400
    When the client requests the course catalog with "<query>"
    Then the course catalog responds with status 400
    And the course error code is "INVALID_QUERY_PARAMETER"
    And the course error message is "One or more query parameters are invalid."
    And the course error includes field "<field>" with message "<message>"

    Examples:
      | query | field | message |
      | modality=remote | modality | modality must be one of online, in-person, hybrid. |
      | status=published | status | status must be one of draft, active, retired. |
      | page=0 | page | page must be an integer greater than or equal to 1. |
      | pageSize=51 | pageSize | pageSize must be between 1 and 50. |
      | sort=name | sort | sort must be one of title, createdAt, updatedAt. |

  Scenario: no matching courses return an empty page
    When the client requests the course catalog with "q=zzzz-not-a-course"
    Then the course catalog responds with status 200
    And the course page metadata is page 1, page size 10, total items 0, and total pages 0
    And the course ids are ""

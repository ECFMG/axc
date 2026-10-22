Feature: Course catalog search

  Scenario: A-AC1 GET /api/courses returns the default page
    When the client requests the course catalog
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 10
    And the course catalog total items is 14
    And the course catalog total pages is 2
    And the course catalog item ids are "course-005,course-006,course-001,course-013,course-009,course-003,course-007,course-014,course-010,course-011"
    And the first course is "course-005" "Accessibility Essentials" "Inclusive interfaces for web applications." "online" "active" "a11y,frontend" "2026-04-01T00:00:00.000Z" "2026-04-02T00:00:00.000Z"

  Scenario: A-AC2 keyword search matches security regardless of case
    When the client requests the course catalog with query "q=SECURITY"
    Then the course catalog responds with status 200
    And the course catalog item ids are "course-001,course-003,course-004,course-002"
    And every returned course matches keyword "security"

  Scenario: A-AC3 modality=online returns only online courses
    When the client requests the course catalog with query "modality=online"
    Then the course catalog responds with status 200
    And the course catalog item ids are "course-005,course-001,course-014,course-010,course-004,course-008"
    And every returned course has modality "online"

  Scenario: A-AC4 status=active returns only active courses
    When the client requests the course catalog with query "status=active"
    Then the course catalog responds with status 200
    And the course catalog item ids are "course-005,course-006,course-001,course-003,course-007,course-014,course-010,course-011"
    And every returned course has status "active"

  Scenario: A-AC5 tag=ai returns courses that contain the ai tag
    When the client requests the course catalog with query "tag=ai"
    Then the course catalog responds with status 200
    And the course catalog item ids are "course-006,course-001"
    And every returned course has tag "ai"

  Scenario: Combined q, modality, and status returns the documented course
    When the client requests the course catalog with query "q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 5
    And the course catalog total items is 1
    And the course catalog total pages is 1
    And the first course is "course-001" "AI Security Foundations" "Introductory course on secure AI-assisted development." "online" "active" "ai,security" "2026-01-15T00:00:00.000Z" "2026-06-01T00:00:00.000Z"

  Scenario: Combined modality and tag returns AI Product Strategy
    When the client requests the course catalog with query "modality=hybrid&tag=ai"
    Then the course catalog responds with status 200
    And the course catalog item ids are "course-006"
    And every returned course has modality "hybrid"
    And every returned course has tag "ai"

  Scenario: A-AC6 page and pageSize limit the page
    When the client requests the course catalog with query "page=1&pageSize=5"
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 5
    And the course catalog total items is 14
    And the course catalog total pages is 3
    And the course catalog item ids are "course-005,course-006,course-001,course-013,course-009"

  Scenario: A-AC7 sort=createdAt returns courses ordered by createdAt
    When the client requests the course catalog with query "sort=createdAt"
    Then the course catalog responds with status 200
    And the course catalog item ids are "course-013,course-009,course-004,course-001,course-007,course-002,course-010,course-003,course-011,course-005"
    And the returned courses are sorted by createdAt

  Scenario Outline: A-AC8 invalid query parameters return HTTP 400
    When the client requests the course catalog with query "<query>"
    Then the course catalog responds with status 400
    And the course catalog error code is "INVALID_QUERY_PARAMETER"
    And the course catalog error message is "One or more query parameters are invalid."
    And the course catalog error detail for "<field>" is "<detail>"

    Examples:
      | query           | field    | detail                                              |
      | modality=remote | modality | modality must be one of online, in-person, hybrid. |
      | status=archived | status   | status must be one of draft, active, retired.      |
      | page=0          | page     | page must be an integer greater than or equal to 1. |
      | page=abc        | page     | page must be an integer greater than or equal to 1. |
      | pageSize=0      | pageSize | pageSize must be between 1 and 50. |
      | pageSize=51     | pageSize | pageSize must be between 1 and 50. |
      | sort=name       | sort     | sort must be one of title, createdAt, updatedAt. |

  Scenario: A-AC9 no matching courses returns an empty page
    When the client requests the course catalog with query "q=zzznomatch"
    Then the course catalog responds with status 200
    And the course catalog items are empty
    And the course catalog page is 1
    And the course catalog page size is 10
    And the course catalog total items is 0
    And the course catalog total pages is 0

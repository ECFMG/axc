Feature: Course catalog search

  The API exposes GET /api/courses to search the seeded training course catalog
  by keyword, modality, status, and tag, with pagination and sorting.

  Scenario: Listing courses uses default pagination and title sort
    When the client requests the course catalog
    Then the course catalog responds with status 200
    And the course page metadata is page 1, pageSize 10, totalItems 16, totalPages 2
    And the course page contains 10 items
    And the course items are sorted by "title"

  Scenario: Keyword search matches title, summary, or tags regardless of case
    When the client requests the course catalog with query "q=SECURITY"
    Then the course catalog responds with status 200
    And the course ids in order are:
      | course-001 |
      | course-016 |
      | course-002 |
      | course-005 |
      | course-011 |

  Scenario: Filtering by modality returns only online courses
    When the client requests the course catalog with query "modality=online"
    Then the course catalog responds with status 200
    And every course has modality "online"
    And the course page metadata is page 1, pageSize 10, totalItems 7, totalPages 1

  Scenario: Filtering by status returns only active courses
    When the client requests the course catalog with query "status=active"
    Then the course catalog responds with status 200
    And every course has status "active"
    And the course page metadata is page 1, pageSize 10, totalItems 10, totalPages 1

  Scenario: Filtering by tag matches the tag regardless of case
    When the client requests the course catalog with query "tag=AI"
    Then the course catalog responds with status 200
    And every course has the tag "ai" ignoring case
    And the course ids in order are:
      | course-001 |
      | course-015 |
      | course-003 |
      | course-008 |

  Scenario: Combining keyword, modality, and status filters
    When the client requests the course catalog with query "q=security&modality=online&status=active"
    Then the course catalog responds with status 200
    And the course ids in order are:
      | course-001 |
      | course-016 |
    And the course page metadata is page 1, pageSize 10, totalItems 2, totalPages 1

  Scenario: Paginating with page and pageSize
    When the client requests the course catalog with query "page=1&pageSize=5"
    Then the course catalog responds with status 200
    And the course page contains 5 items
    And the course page metadata is page 1, pageSize 5, totalItems 16, totalPages 4

  Scenario: Requesting the second default page returns the remaining courses
    When the client requests the course catalog with query "page=2"
    Then the course catalog responds with status 200
    And the course page contains 6 items
    And the course page metadata is page 2, pageSize 10, totalItems 16, totalPages 2

  Scenario: Sorting by createdAt
    When the client requests the course catalog with query "sort=createdAt"
    Then the course catalog responds with status 200
    And the course items are sorted by "createdAt"
    And the first course id is "course-010"

  Scenario: No matching courses returns an empty list, not an error
    When the client requests the course catalog with query "q=no-such-course-keyword"
    Then the course catalog responds with status 200
    And the course page contains 0 items
    And the course page metadata is page 1, pageSize 10, totalItems 0, totalPages 0

  Scenario Outline: Invalid <field> returns 400 with the error contract
    When the client requests the course catalog with query "<query>"
    Then the course catalog responds with status 400
    And the course catalog error reports field "<field>" with message "<message>"

    Examples:
      | field    | query           | message                                            |
      | modality | modality=remote | modality must be one of: online, in-person, hybrid. |
      | status   | status=archived | status must be one of: draft, active, retired.     |
      | page     | page=0          | page must be a positive integer.                   |
      | page     | page=abc        | page must be a positive integer.                   |
      | pageSize | pageSize=51     | pageSize must be between 1 and 50.                 |
      | pageSize | pageSize=0      | pageSize must be between 1 and 50.                 |
      | sort     | sort=popularity | sort must be one of: title, createdAt, updatedAt.  |

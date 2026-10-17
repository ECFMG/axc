Feature: MongoDB course search

  Scenario: Default title page
    When the repository searches with ""
    Then the course ids are "course-001,course-002,course-003,course-004,course-005,course-006,course-007,course-008,course-009,course-010" and total count is 12

  Scenario: Keyword title
    When the repository searches with "q=fOuNdAtIoNs"
    Then the course ids are "course-001" and total count is 1

  Scenario: Keyword summary
    When the repository searches with "q=SERVER"
    Then the course ids are "course-002" and total count is 1

  Scenario: Keyword tags
    When the repository searches with "q=CLOUD"
    Then the course ids are "course-003,course-011" and total count is 2

  Scenario: Online
    When the repository searches with "modality=online"
    Then the course ids are "course-001,course-004,course-007,course-010" and total count is 4

  Scenario: In person
    When the repository searches with "modality=in-person"
    Then the course ids are "course-002,course-005,course-008,course-011" and total count is 4

  Scenario: Hybrid
    When the repository searches with "modality=hybrid"
    Then the course ids are "course-003,course-006,course-009,course-012" and total count is 4

  Scenario: Draft
    When the repository searches with "status=draft"
    Then the course ids are "course-002,course-004,course-009" and total count is 3

  Scenario: Active
    When the repository searches with "status=active"
    Then the course ids are "course-001,course-005,course-006,course-010,course-011,course-012" and total count is 6

  Scenario: Retired
    When the repository searches with "status=retired"
    Then the course ids are "course-003,course-007,course-008" and total count is 3

  Scenario: Tag exact case insensitive
    When the repository searches with "tag=AI"
    Then the course ids are "course-001,course-004,course-012" and total count is 3

  Scenario: Tag is not a substring
    When the repository searches with "tag=secur"
    Then the course ids are "" and total count is 0

  Scenario: All three filters
    When the repository searches with "q=SECURITY&modality=online&status=active"
    Then the course ids are "course-001" and total count is 1

  Scenario: Modality and tag
    When the repository searches with "modality=hybrid&tag=ai"
    Then the course ids are "course-012" and total count is 1

  Scenario: Page two
    When the repository searches with "page=2&pageSize=5"
    Then the course ids are "course-006,course-007,course-008,course-009,course-010" and total count is 12

  Scenario: Last page
    When the repository searches with "page=3&pageSize=5"
    Then the course ids are "course-011,course-012" and total count is 12

  Scenario: Beyond last page
    When the repository searches with "page=5"
    Then the course ids are "" and total count is 12

  Scenario: Created sort
    When the repository searches with "sort=createdAt&pageSize=3"
    Then the course ids are "course-012,course-011,course-010" and total count is 12

  Scenario: Updated sort
    When the repository searches with "sort=updatedAt&pageSize=3"
    Then the course ids are "course-001,course-002,course-003" and total count is 12

  Scenario: Maximum size
    When the repository searches with "pageSize=50"
    Then the course ids are "course-001,course-002,course-003,course-004,course-005,course-006,course-007,course-008,course-009,course-010,course-011,course-012" and total count is 12

  Scenario: No match
    When the repository searches with "q=nothing+matches"
    Then the course ids are "" and total count is 0

  Scenario: Literal regex keyword
    When the repository searches with "q=.%2A"
    Then the course ids are "" and total count is 0

  Scenario: Literal regex tag
    When the repository searches with "tag=.%2A"
    Then the course ids are "" and total count is 0


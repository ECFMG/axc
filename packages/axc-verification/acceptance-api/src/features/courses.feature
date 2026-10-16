Feature: Course catalog endpoint

  Scenario: Default paginated catalog
    Given the sample course catalog
    When the client requests courses ""
    Then the catalog contains "course-001,course-002,course-004,course-003,course-005,course-006,course-007,course-008,course-009,course-010" on page 1 of size 10 with total 12

  Scenario: Keyword security is case insensitive
    Given the sample course catalog
    When the client requests courses "?q=SECURITY"
    Then the catalog contains "course-001,course-002,course-003" on page 1 of size 10 with total 3

  Scenario: Only online courses
    Given the sample course catalog
    When the client requests courses "?modality=online"
    Then the catalog contains "course-001,course-004,course-007,course-010" on page 1 of size 10 with total 4

  Scenario: Only active courses
    Given the sample course catalog
    When the client requests courses "?status=active"
    Then the catalog contains "course-001,course-004,course-005,course-008,course-012" on page 1 of size 10 with total 5

  Scenario: Case insensitive exact tag
    Given the sample course catalog
    When the client requests courses "?tag=AI"
    Then the catalog contains "course-001,course-004,course-007" on page 1 of size 10 with total 3

  Scenario: Keyword modality status intersection
    Given the sample course catalog
    When the client requests courses "?q=security&modality=online&status=active"
    Then the catalog contains "course-001" on page 1 of size 10 with total 1

  Scenario: Tag status intersection
    Given the sample course catalog
    When the client requests courses "?tag=ai&status=draft"
    Then the catalog contains "course-007" on page 1 of size 10 with total 1

  Scenario: First page of five
    Given the sample course catalog
    When the client requests courses "?page=1&pageSize=5"
    Then the catalog contains "course-001,course-002,course-004,course-003,course-005" on page 1 of size 5 with total 12

  Scenario: Second page of five
    Given the sample course catalog
    When the client requests courses "?page=2&pageSize=5"
    Then the catalog contains "course-006,course-007,course-008,course-009,course-010" on page 2 of size 5 with total 12

  Scenario: Created time ascending
    Given the sample course catalog
    When the client requests courses "?sort=createdAt&pageSize=50"
    Then the catalog contains "course-012,course-011,course-010,course-009,course-008,course-007,course-006,course-005,course-004,course-003,course-002,course-001" on page 1 of size 50 with total 12

  Scenario: Updated time ascending
    Given the sample course catalog
    When the client requests courses "?sort=updatedAt&pageSize=50"
    Then the catalog contains "course-001,course-002,course-003,course-004,course-005,course-006,course-007,course-008,course-009,course-010,course-011,course-012" on page 1 of size 50 with total 12

  Scenario: No matches
    Given the sample course catalog
    When the client requests courses "?q=nonexistent"
    Then the catalog contains "" on page 1 of size 10 with total 0

  Scenario: Page beyond end
    Given the sample course catalog
    When the client requests courses "?page=99"
    Then the catalog contains "" on page 99 of size 10 with total 12

  Scenario: Reject invalid modality
    Given the sample course catalog
    When the client requests courses "?modality=remote"
    Then the catalog rejects field "modality"

  Scenario: Reject invalid status
    Given the sample course catalog
    When the client requests courses "?status=pending"
    Then the catalog rejects field "status"

  Scenario: Reject invalid page
    Given the sample course catalog
    When the client requests courses "?page=0"
    Then the catalog rejects field "page"

  Scenario: Reject invalid pageSize
    Given the sample course catalog
    When the client requests courses "?pageSize=51"
    Then the catalog rejects field "pageSize"

  Scenario: Reject invalid sort
    Given the sample course catalog
    When the client requests courses "?sort=id"
    Then the catalog rejects field "sort"

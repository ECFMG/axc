Feature: Course catalog search

  Scenario: Default list is paginated and sorted by title
    When the client requests the course catalog at "/api/courses"
    Then the course catalog responds with status 200
    And the course page is 1
    And the course page size is 10
    And the course item count is 10
    And the course total items is 12
    And the course total pages is 2
    And the course titles are "Accessibility Fundamentals | Active Online Teaching | AI Security Foundations | Classroom Facilitation | Cloud Operations Basics | Draft Hybrid Compliance | Hybrid AI Studio | Hybrid Leadership Lab | In-Person Security Workshop | Online Data Privacy"

  Scenario: Keyword search matches title, summary, and tags regardless of case
    When the client requests the course catalog at "/api/courses?q=SECURITY"
    Then the course catalog responds with status 200
    And the course titles are "AI Security Foundations | In-Person Security Workshop | Security for Managers"
    When the client requests the course catalog at "/api/courses?q=inclusive"
    Then the course catalog responds with status 200
    And the course titles are "Accessibility Fundamentals"
    When the client requests the course catalog at "/api/courses?q=ASSESSMENT"
    Then the course catalog responds with status 200
    And the course titles are "Active Online Teaching"

  Scenario: Modality, status, and tag filters
    When the client requests the course catalog at "/api/courses?modality=online"
    Then the course catalog responds with status 200
    And the course total items is 5
    And every course modality is "online"
    When the client requests the course catalog at "/api/courses?status=active"
    Then the course catalog responds with status 200
    And the course total items is 5
    And every course status is "active"
    When the client requests the course catalog at "/api/courses?tag=AI"
    Then the course catalog responds with status 200
    And the course titles are "AI Security Foundations | Hybrid AI Studio"

  Scenario: Combined keyword, modality, and status filters
    When the client requests the course catalog at "/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
    Then the course catalog responds with status 200
    And the course total items is 1
    And the course total pages is 1
    And the only course is "course-001" titled "AI Security Foundations" with modality "online" and status "active" and tags "ai,security" and summary "Introductory course on secure AI-assisted development." and created at "2026-01-15T00:00:00.000Z" and updated at "2026-06-01T00:00:00.000Z"

  Scenario: Page and page size metadata
    When the client requests the course catalog at "/api/courses?page=2&pageSize=5"
    Then the course catalog responds with status 200
    And the course page is 2
    And the course page size is 5
    And the course item count is 5
    And the course total items is 12
    And the course total pages is 3
    And the course titles are "Draft Hybrid Compliance | Hybrid AI Studio | Hybrid Leadership Lab | In-Person Security Workshop | Online Data Privacy"

  Scenario: Sort by createdAt
    When the client requests the course catalog at "/api/courses?sort=createdAt&pageSize=50"
    Then the course catalog responds with status 200
    And the course titles are "Retired Onsite Safety | Security for Managers | Online Data Privacy | AI Security Foundations | Hybrid AI Studio | In-Person Security Workshop | Active Online Teaching | Hybrid Leadership Lab | Classroom Facilitation | Cloud Operations Basics | Draft Hybrid Compliance | Accessibility Fundamentals"

  Scenario: Invalid query parameters
    When the client requests the course catalog at "/api/courses?modality=classroom&status=paused&page=0&pageSize=51&sort=rank"
    Then the course catalog responds with status 400
    And the course catalog error code is "INVALID_QUERY_PARAMETER"
    And the course catalog error message is "One or more query parameters are invalid."
    And the course catalog error fields are "modality | status | page | pageSize | sort"
    And the course catalog error detail for "pageSize" is "pageSize must be between 1 and 50."

  Scenario: No matching courses
    When the client requests the course catalog at "/api/courses?q=zzznomatch"
    Then the course catalog responds with status 200
    And the course item count is 0
    And the course page is 1
    And the course page size is 10
    And the course total items is 0
    And the course total pages is 0

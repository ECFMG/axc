Feature: Course Query

  Scenario: The client reads the default course page
    When the client requests courses with query ""
    Then the courses response status is 200
    And the courses page is 1 and the page size is 10
    And the courses total is 12 items and 2 pages
    And the courses item count is 10
    And the first course title is "AI Product Design"
    And the courses are sorted by title

  Scenario: Keyword search matches title, summary, and tags regardless of case
    When the client requests courses with query "?q=SeCuRiTy"
    Then the courses response status is 200
    And the courses total is 5 items and 1 pages
    And the courses include title "AI Security Foundations"
    And the courses include title "Cloud Security Lab"
    And the courses include title "Platform Hardening"
    And the courses include title "Tabletop Exercises"
    And the courses include title "Security Operations"
    And every course matches keyword "security"

  Scenario: Modality filter returns only online courses
    When the client requests courses with query "?modality=online"
    Then the courses response status is 200
    And the courses total is 5 items and 1 pages
    And every course modality is "online"

  Scenario: Status filter returns only active courses
    When the client requests courses with query "?status=active"
    Then the courses response status is 200
    And the courses total is 7 items and 1 pages
    And every course status is "active"

  Scenario: Tag filter matches a tag regardless of case
    When the client requests courses with query "?tag=ai"
    Then the courses response status is 200
    And the courses total is 3 items and 1 pages
    And the courses include title "Tag Case Study"
    And every course has tag "ai"

  Scenario: Combined keyword, modality, and status filters
    When the client requests courses with query "?q=security&modality=online&status=active"
    Then the courses response status is 200
    And the courses total is 2 items and 1 pages
    And the courses include title "AI Security Foundations"
    And the courses include title "Platform Hardening"
    And every course modality is "online"
    And every course status is "active"

  Scenario: Pagination limits the page
    When the client requests courses with query "?page=1&pageSize=5"
    Then the courses response status is 200
    And the courses page is 1 and the page size is 5
    And the courses total is 12 items and 3 pages
    And the courses item count is 5

  Scenario: The second page returns the remaining courses
    When the client requests courses with query "?page=2&pageSize=10"
    Then the courses response status is 200
    And the courses page is 2 and the page size is 10
    And the courses item count is 2
    And the first course title is "Tabletop Exercises"

  Scenario: Sort by createdAt
    When the client requests courses with query "?sort=createdAt"
    Then the courses response status is 200
    And the first course title is "Draft Onboarding"
    And the courses are sorted by createdAt

  Scenario: No matching courses return an empty page
    When the client requests courses with query "?q=zzzz-no-course"
    Then the courses response status is 200
    And the courses item count is 0
    And the courses total is 0 items and 0 pages
    And the courses page is 1 and the page size is 10

  Scenario: Invalid modality is rejected
    When the client requests courses with query "?modality=telepathy"
    Then the courses response status is 400
    And the courses error code is "INVALID_QUERY_PARAMETER"
    And the courses error details include field "modality"

  Scenario: Invalid status is rejected
    When the client requests courses with query "?status=archived"
    Then the courses response status is 400
    And the courses error details include field "status"

  Scenario: Invalid page is rejected
    When the client requests courses with query "?page=0"
    Then the courses response status is 400
    And the courses error details include field "page"

  Scenario: Invalid page size is rejected
    When the client requests courses with query "?pageSize=51"
    Then the courses response status is 400
    And the courses error details include field "pageSize"
    And the courses error message for "pageSize" is "pageSize must be between 1 and 50."

  Scenario: Invalid sort is rejected
    When the client requests courses with query "?sort=popularity"
    Then the courses response status is 400
    And the courses error details include field "sort"

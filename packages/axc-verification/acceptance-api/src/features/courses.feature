Feature: Course search

  These scenarios preserve the Task Set A course catalog for B-AC1.

  Scenario: B-AC1 GET /api/courses returns the default page
    When the client requests the course catalog
    Then the response status is 200
    And the course page uses page 1 and page size 10
    And the course page lists 10 of 12 courses
    And the course page has 2 total pages
    And the first course is "course-001"

  Scenario: keyword search matches security regardless of case
    When the client searches courses with "q=SeCuRiTy"
    Then the response status is 200
    And the course page total is 5
    And every returned course matches "security" in the title, summary, or tags
    And the course page includes "AI Security Foundations" and "Tagging and Search Lab"

  Scenario: modality online returns only online courses
    When the client searches courses with "modality=online"
    Then the response status is 200
    And every returned course has modality "online"
    And the course page total is 5

  Scenario: status active returns only active courses
    When the client searches courses with "status=active"
    Then the response status is 200
    And every returned course has status "active"
    And the course page total is 7

  Scenario: tag ai returns courses that contain the ai tag
    When the client searches courses with "tag=AI"
    Then the response status is 200
    And every returned course contains the tag "ai"
    And the course page includes "AI Security Foundations" and "Product Strategy with AI"

  Scenario: page and pageSize limit the page
    When the client searches courses with "page=1&pageSize=5"
    Then the response status is 200
    And the course page uses page 1 and page size 5
    And the course page lists 5 of 12 courses

  Scenario: sort createdAt returns courses ordered by createdAt
    When the client searches courses with "sort=createdAt"
    Then the response status is 200
    And the first course is "course-009"
    And the courses are sorted by createdAt ascending

  Scenario: invalid query parameters return HTTP 400
    When the client searches courses with "modality=classroom&status=open&page=0&pageSize=51&sort=popularity"
    Then the response status is 400
    And the error code is "INVALID_QUERY_PARAMETER"
    And the error details include field "modality"
    And the error details include field "status"
    And the error details include field "page"
    And the error details include field "pageSize"
    And the error details include field "sort"

  Scenario: no matching courses returns an empty page
    When the client searches courses with "q=zzzz-not-a-course"
    Then the response status is 200
    And the course page uses page 1 and page size 10
    And the course page lists 0 of 0 courses
    And the course page has 0 total pages

  Scenario: combined keyword modality and status filters
    When the client searches courses with "q=security&modality=online&status=active"
    Then the response status is 200
    And the course page total is 2
    And the course page includes "AI Security Foundations" and "Tagging and Search Lab"
    And every returned course has modality "online"
    And every returned course has status "active"
    And every returned course matches "security" in the title, summary, or tags

  Scenario: the documented example query returns AI Security Foundations
    When the client searches courses with "q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
    Then the response status is 200
    And the course page uses page 1 and page size 5
    And the course page lists 1 of 1 courses
    And the first course is "course-001"

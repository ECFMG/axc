Feature: Course catalog search

  Scenario: GET /api/courses returns the first page
    When the client requests the course catalog
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 10
    And the course catalog contains 10 courses
    And the course catalog total is 12
    And the course catalog total pages are 2
    And the first course is "AI Product Studio"

  Scenario: Keyword search matches title, summary, and tags regardless of case
    When the client requests the course catalog with "q=SECURITY"
    Then the course catalog responds with status 200
    And the course titles are "AI Security Foundations, Data Privacy Overview, Platform Operations, Security Coding Workshop, Security Operations Center"

  Scenario: Modality filter returns only online courses
    When the client requests the course catalog with "modality=online"
    Then the course catalog responds with status 200
    And the course titles are "AI Security Foundations, Draft Curriculum Design, Platform Operations, Security Operations Center"

  Scenario: Status filter returns only active courses
    When the client requests the course catalog with "status=active"
    Then the course catalog responds with status 200
    And the course titles are "AI Product Studio, AI Security Foundations, Hybrid Delivery Lab, In-Person Coaching, Security Coding Workshop"

  Scenario: Tag filter matches a tag regardless of case
    When the client requests the course catalog with "tag=AI"
    Then the course catalog responds with status 200
    And the course titles are "AI Product Studio, AI Security Foundations"

  Scenario: Combined keyword, modality, and status filters
    When the client requests the course catalog with "q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
    Then the course catalog responds with status 200
    And the course catalog page is 1
    And the course catalog page size is 5
    And the course catalog total is 1
    And the course catalog total pages are 1
    And the course titles are "AI Security Foundations"

  Scenario: Pagination returns the requested page
    When the client requests the course catalog with "page=2&pageSize=5"
    Then the course catalog responds with status 200
    And the course catalog page is 2
    And the course catalog page size is 5
    And the course catalog contains 5 courses
    And the course catalog total is 12
    And the course catalog total pages are 3
    And the course titles are "Hybrid Delivery Lab, In-Person Coaching, Platform Operations, Retired Archive Methods, Security Coding Workshop"

  Scenario: Sorting by createdAt changes the order
    When the client requests the course catalog with "sort=createdAt"
    Then the course catalog responds with status 200
    And the first course is "Zebra Onboarding"
    And the course catalog total is 12

  Scenario: No matching courses return an empty page
    When the client requests the course catalog with "q=not-a-course-xyz"
    Then the course catalog responds with status 200
    And the course catalog contains 0 courses
    And the course catalog page is 1
    And the course catalog page size is 10
    And the course catalog total is 0
    And the course catalog total pages are 0

  Scenario Outline: Invalid query parameters return 400
    When the client requests the course catalog with "<query>"
    Then the course catalog rejects the query
    And the course catalog error field "<field>" says "<message>"

    Examples:
      | query            | field     | message                                              |
      | modality=remote  | modality  | modality must be online, in-person, or hybrid.      |
      | status=published | status    | status must be draft, active, or retired.           |
      | page=0           | page      | page must be an integer greater than or equal to 1. |
      | page=abc         | page      | page must be an integer greater than or equal to 1. |
      | pageSize=0       | pageSize  | pageSize must be between 1 and 50.                  |
      | pageSize=51      | pageSize  | pageSize must be between 1 and 50.                  |
      | sort=name        | sort      | sort must be title, createdAt, or updatedAt.        |

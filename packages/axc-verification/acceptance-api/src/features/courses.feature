Feature: Course catalog search

  Scenario: A-AC1 default pagination returns the first page of courses
    When the client sends a GET request to "/api/courses"
    Then the response status is 200
    And the response pagination is page 1 pageSize 10 totalItems 12 totalPages 2
    And the response has 10 items

  Scenario: A-AC2 keyword search matches title, summary, and tags regardless of case
    When the client sends a GET request to "/api/courses?q=SeCuRiTy"
    Then the response status is 200
    And the response has 4 items
    And every item mentions "security"
    And the response items include "AI Security Foundations"
    And the response items include "Incident Response Drills"
    And the response items include "Secure Code Review"

  Scenario: A-AC3 modality filter returns only online courses
    When the client sends a GET request to "/api/courses?modality=online"
    Then the response status is 200
    And the response has 5 items
    And every item has modality "online"

  Scenario: A-AC4 status filter returns only active courses
    When the client sends a GET request to "/api/courses?status=active"
    Then the response status is 200
    And the response has 6 items
    And every item has status "active"

  Scenario: A-AC5 tag filter returns courses carrying the tag
    When the client sends a GET request to "/api/courses?tag=AI"
    Then the response status is 200
    And the response has 3 items
    And every item has the tag "ai"

  Scenario: A-AC6 pageSize caps the page and metadata describes the result set
    When the client sends a GET request to "/api/courses?page=1&pageSize=5"
    Then the response status is 200
    And the response has 5 items
    And the response pagination is page 1 pageSize 5 totalItems 12 totalPages 3
    When the client sends a GET request to "/api/courses?page=3&pageSize=5"
    Then the response status is 200
    And the response has 2 items

  Scenario: A-AC7 sort=createdAt orders records by createdAt
    When the client sends a GET request to "/api/courses?sort=createdAt&pageSize=50"
    Then the response status is 200
    And the response has 12 items
    And the response items are sorted ascending by createdAt

  Scenario: A-AC8 invalid query parameters return 400
    When the client sends a GET request to "/api/courses?modality=telepathic"
    Then the response status is 400
    And the error code is "INVALID_QUERY_PARAMETER"
    And the error details name the field "modality"
    When the client sends a GET request to "/api/courses?status=paused"
    Then the response status is 400
    And the error details name the field "status"
    When the client sends a GET request to "/api/courses?page=0"
    Then the response status is 400
    And the error details name the field "page"
    When the client sends a GET request to "/api/courses?pageSize=51"
    Then the response status is 400
    And the error details name the field "pageSize"
    When the client sends a GET request to "/api/courses?sort=price"
    Then the response status is 400
    And the error details name the field "sort"

  Scenario: A-AC9 no matches return 200 with an empty items array
    When the client sends a GET request to "/api/courses?q=underwater%20basket%20weaving"
    Then the response status is 200
    And the response has 0 items
    And the response pagination is page 1 pageSize 10 totalItems 0 totalPages 0

  Scenario: A-AC10 the existing healthcheck contract still holds
    When the client sends a GET request to "/health"
    Then the response status is 200
    And the healthcheck body matches the agentCourses contract

  Scenario: A-AC11 combined filters narrow the result set
    When the client sends a GET request to "/api/courses?q=security&modality=online&status=active"
    Then the response status is 200
    And the response has 1 items
    And the response items include "AI Security Foundations"
    When the client sends a GET request to "/api/courses?tag=cloud&status=draft&sort=updatedAt"
    Then the response status is 200
    And the response has 1 items
    And the response items include "Kubernetes Operations"

  Scenario: A-AC12 the documented example request returns the documented shape
    When the client sends a GET request to "/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
    Then the response status is 200
    And the response has 1 items
    And the response pagination is page 1 pageSize 5 totalItems 1 totalPages 1
    And every item carries every documented course field

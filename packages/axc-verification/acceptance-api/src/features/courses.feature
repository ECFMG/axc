Feature: Course catalog search

  Scenario: Default catalog page
    When the client requests the course catalog
    Then the course catalog responds with status 200
    And the course page is 1
    And the course page size is 10
    And the course total items is 12
    And the course total pages is 2
    And the course items count is 10
    And the course titles are "Accessibility Basics,AI Ethics,AI Security Foundations,Cloud Basics,Data Privacy,Facilitation Studio,Incident Response,Leadership Lab,New Hire Onboarding,Platform Operations"

  Scenario: Keyword search is case insensitive
    When the client requests the course catalog with "q=SECURITY"
    Then the course catalog responds with status 200
    And the course titles are "AI Security Foundations,Platform Operations,Workshop for Teams"

  Scenario: Lowercase keyword search matches the same courses
    When the client requests the course catalog with "q=security"
    Then the course catalog responds with status 200
    And the course titles are "AI Security Foundations,Platform Operations,Workshop for Teams"

  Scenario: Modality filter
    When the client requests the course catalog with "modality=online"
    Then the course catalog responds with status 200
    And the course titles are "Accessibility Basics,AI Ethics,AI Security Foundations,Data Privacy"

  Scenario: Status filter
    When the client requests the course catalog with "status=active"
    Then the course catalog responds with status 200
    And the course titles are "AI Security Foundations,Data Privacy,Facilitation Studio,Platform Operations,Workplace Safety,Workshop for Teams"

  Scenario: Tag filter is case insensitive
    When the client requests the course catalog with "tag=AI"
    Then the course catalog responds with status 200
    And the course titles are "AI Ethics,AI Security Foundations,Facilitation Studio"

  Scenario: Combined keyword, modality, status, and tag filters
    When the client requests the course catalog with "q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title"
    Then the course catalog responds with status 200
    And the course page is 1
    And the course page size is 5
    And the course total items is 1
    And the course total pages is 1
    And the first course is AI Security Foundations

  Scenario: Page size limits the page
    When the client requests the course catalog with "page=1&pageSize=5"
    Then the course catalog responds with status 200
    And the course page is 1
    And the course page size is 5
    And the course total items is 12
    And the course total pages is 3
    And the course items count is 5
    And the course titles are "Accessibility Basics,AI Ethics,AI Security Foundations,Cloud Basics,Data Privacy"

  Scenario: A later page returns the next courses
    When the client requests the course catalog with "page=2&pageSize=5"
    Then the course catalog responds with status 200
    And the course titles are "Facilitation Studio,Incident Response,Leadership Lab,New Hire Onboarding,Platform Operations"

  Scenario: Maximum page size returns the whole catalog
    When the client requests the course catalog with "pageSize=50"
    Then the course catalog responds with status 200
    And the course page size is 50
    And the course total items is 12
    And the course total pages is 1
    And the course items count is 12

  Scenario: Created date sort
    When the client requests the course catalog with "sort=createdAt"
    Then the course catalog responds with status 200
    And the first course titles are "Accessibility Basics,Incident Response"

  Scenario: Unknown query parameters are ignored
    When the client requests the course catalog with "extra=1"
    Then the course catalog responds with status 200
    And the course total items is 12

  Scenario: No matching courses
    When the client requests the course catalog with "q=zzzz-no-such-course"
    Then the course catalog responds with status 200
    And the course items count is 0
    And the course total items is 0
    And the course total pages is 0
    And the course page is 1
    And the course page size is 10

  Scenario Outline: Invalid course query parameters
    When the client requests the course catalog with "<query>"
    Then the course catalog responds with status 400
    And the only course error detail is field "<field>" and message "<message>"

    Examples:
      | query              | field    | message                                              |
      | modality=classroom | modality | modality must be online, in-person, or hybrid.      |
      | status=published   | status   | status must be draft, active, or retired.           |
      | page=0             | page     | page must be an integer greater than or equal to 1. |
      | page=foo           | page     | page must be an integer greater than or equal to 1. |
      | pageSize=0         | pageSize | pageSize must be between 1 and 50.                  |
      | pageSize=51        | pageSize | pageSize must be between 1 and 50.                  |
      | sort=popularity    | sort     | sort must be title, createdAt, or updatedAt.        |

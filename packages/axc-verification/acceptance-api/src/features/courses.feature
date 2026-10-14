Feature: Course catalog search

  Scenario: GET /api/courses returns the default page
    When the client requests '/api/courses'
    Then the response status is 200
    And the course list uses default pagination
    And each course item has the required catalog fields

  Scenario: GET /api/courses?q=security matches title, summary, or tags
    When the client requests '/api/courses?q=security'
    Then the response status is 200
    And the course list is not empty
    And every returned course matches keyword 'security'

  Scenario: GET /api/courses?q=SECURITY is case-insensitive
    When the client requests '/api/courses?q=SECURITY'
    Then the response status is 200
    And the course list is not empty
    And every returned course matches keyword 'security'

  Scenario: GET /api/courses?modality=online returns only online courses
    When the client requests '/api/courses?modality=online'
    Then the response status is 200
    And the course list is not empty
    And every returned course has modality 'online'

  Scenario: GET /api/courses?status=active returns only active courses
    When the client requests '/api/courses?status=active'
    Then the response status is 200
    And the course list is not empty
    And every returned course has status 'active'

  Scenario: GET /api/courses?tag=ai returns courses tagged ai
    When the client requests '/api/courses?tag=ai'
    Then the response status is 200
    And the course list is not empty
    And every returned course has tag 'ai'

  Scenario: GET /api/courses?tag=AI matches tags case-insensitively
    When the client requests '/api/courses?tag=AI'
    Then the response status is 200
    And the course list is not empty
    And every returned course has tag 'ai'

  Scenario: GET /api/courses combines q, modality, and status
    When the client requests '/api/courses?q=security&modality=online&status=active'
    Then the response status is 200
    And the course list is not empty
    And every returned course matches keyword 'security'
    And every returned course has modality 'online'
    And every returned course has status 'active'

  Scenario: GET /api/courses?page=1&pageSize=5 paginates
    When the client requests '/api/courses?page=1&pageSize=5'
    Then the response status is 200
    And the course list page is 1 with page size 5
    And the course list includes pagination metadata

  Scenario: GET /api/courses?sort=createdAt sorts by createdAt
    When the client requests '/api/courses?sort=createdAt'
    Then the response status is 200
    And the course list is sorted by createdAt ascending

  Scenario Outline: Invalid query parameters return 400
    When the client requests '/api/courses?<query>'
    Then the response status is 400
    And the error code is 'INVALID_QUERY_PARAMETER'
    And the error details include field '<field>'

    Examples:
      | query           | field    |
      | modality=remote | modality |
      | modality=       | modality |
      | status=archived | status   |
      | status=         | status   |
      | page=0          | page     |
      | page=abc        | page     |
      | page=           | page     |
      | pageSize=0      | pageSize |
      | pageSize=51     | pageSize |
      | pageSize=       | pageSize |
      | sort=popularity | sort     |
      | sort=           | sort     |

  Scenario: Multiple invalid query parameters are all reported
    When the client requests '/api/courses?modality=nope&status=nope&page=0&pageSize=99&sort=nope'
    Then the response status is 400
    And the error code is 'INVALID_QUERY_PARAMETER'
    And the error details include field 'modality'
    And the error details include field 'status'
    And the error details include field 'page'
    And the error details include field 'pageSize'
    And the error details include field 'sort'

  Scenario: GET /api/courses with no matches returns an empty list
    When the client requests '/api/courses?q=xyzzy-no-such-course'
    Then the response status is 200
    And the course list is empty with pagination metadata

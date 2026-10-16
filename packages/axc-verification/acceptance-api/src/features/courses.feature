Feature: Course catalog search

  Scenario: GET /api/courses returns the default page
    When the client requests the course catalog
    Then the course catalog responds with status 200
    And the course catalog returns the default page

  Scenario: GET /api/courses applies keyword, modality, and status together
    When the client requests the course catalog with query "q=security&modality=online&status=active"
    Then the course catalog responds with status 200
    And the course catalog returns the online active security course

  Scenario: GET /api/courses rejects an invalid page size
    When the client requests the course catalog with query "pageSize=51"
    Then the course catalog responds with status 400
    And the course catalog rejects the page size

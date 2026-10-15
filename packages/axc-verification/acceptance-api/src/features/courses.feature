Feature: Course catalog search

  Scenario: GET /api/courses returns the first page
    When the client requests the course catalog
    Then the course catalog responds with status 200
    And the course catalog returns the default page

  Scenario: GET /api/courses applies keyword, modality, and status together
    When the client searches active online courses for "security"
    Then the course catalog responds with status 200
    And the course catalog returns the security online active courses

  Scenario: GET /api/courses rejects an invalid page size
    When the client requests the course catalog with page size 51
    Then the course catalog responds with status 400
    And the course catalog rejects the page size

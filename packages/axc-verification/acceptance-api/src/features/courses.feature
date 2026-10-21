Feature: Course catalog search
  Clients can search the local training catalog through the API host.

  Scenario: Combined search returns an active online AI security course
    When the client searches courses with "q=security&modality=online&status=active&tag=ai&pageSize=5"
    Then the course search responds with status 200
    And the course results contain only "course-001" with page size 5

  Scenario: Invalid page size returns the documented error
    When the client searches courses with "pageSize=51"
    Then the course search responds with status 400
    And the course search reports an invalid page size

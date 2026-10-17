Feature: Course catalog API

  Scenario: A-AC1 default catalog
    When the client searches courses with ""
    Then the catalog response is 200 with 10 items for "default"

  Scenario: A-AC2 security search
    When the client searches courses with "q=SeCuRiTy"
    Then the catalog response is 200 with 4 items for "security"

  Scenario: A-AC3 online filter
    When the client searches courses with "modality=online"
    Then the catalog response is 200 with 4 items for "online"

  Scenario: A-AC4 active filter
    When the client searches courses with "status=active"
    Then the catalog response is 200 with 6 items for "active"

  Scenario: A-AC5 ai tag
    When the client searches courses with "tag=AI"
    Then the catalog response is 200 with 3 items for "ai"

  Scenario: A-AC6 pagination
    When the client searches courses with "page=2&pageSize=5"
    Then the catalog response is 200 with 5 items for "page"

  Scenario: A-AC7 created date order
    When the client searches courses with "sort=createdAt"
    Then the catalog response is 200 with 10 items for "createdAt"

  Scenario: Updated date order
    When the client searches courses with "sort=updatedAt"
    Then the catalog response is 200 with 10 items for "updatedAt"

  Scenario: Combined keyword modality status
    When the client searches courses with "q=security&modality=online&status=active"
    Then the catalog response is 200 with 1 items for "combined"

  Scenario: Combined tag modality
    When the client searches courses with "tag=ai&modality=hybrid"
    Then the catalog response is 200 with 1 items for "combinedTag"

  Scenario: A-AC9 no matches
    When the client searches courses with "q=no-course-matches-this"
    Then the catalog response is 200 with 0 items for "empty"

  Scenario: A-AC8 invalid modality
    When the client searches courses with "modality=remote"
    Then the catalog response is 400 with 0 items for "modality"

  Scenario: A-AC8 invalid status
    When the client searches courses with "status=invalid"
    Then the catalog response is 400 with 0 items for "status"

  Scenario: A-AC8 invalid page
    When the client searches courses with "page=0"
    Then the catalog response is 400 with 0 items for "page"

  Scenario: A-AC8 invalid pageSize
    When the client searches courses with "pageSize=51"
    Then the catalog response is 400 with 0 items for "pageSize"

  Scenario: A-AC8 invalid sort
    When the client searches courses with "sort=invalid"
    Then the catalog response is 400 with 0 items for "sort"


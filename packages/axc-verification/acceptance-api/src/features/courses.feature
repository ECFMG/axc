Feature: Course catalog search (TS-A-CATALOG-SEARCH)

  Scenario: Default list and complete course model (A-AC1)
    When the catalog client requests ""
    Then the catalog responds with status 200
    And the catalog has page 1 and page size 10
    And the catalog contains 10 courses out of 12 across 2 pages
    And every catalog course has the required model fields
    And the catalog is sorted by "title"

  Scenario: Keyword searches all searchable fields regardless of case (A-AC2)
    When the catalog client requests "q=SECURITY"
    Then the catalog responds with status 200
    And the catalog contains course ids "course-001,course-007,course-009"

  Scenario Outline: Individual and combined filters (A-AC3, A-AC4, A-AC5, A-AC11)
    When the catalog client requests "<query>"
    Then the catalog responds with status 200
    And every catalog course has "<field>" equal to "<value>"
    And the catalog contains <count> courses out of <count> across 1 pages

    Examples:
      | query                                  | field    | value     | count |
      | modality=online                        | modality | online    | 4     |
      | modality=in-person                     | modality | in-person | 4     |
      | modality=hybrid                        | modality | hybrid    | 4     |
      | status=active                          | status   | active    | 7     |
      | status=draft                           | status   | draft     | 3     |
      | status=retired                         | status   | retired   | 2     |
      | tag=AI                                 | tag      | ai        | 3     |
      | q=security&modality=online&status=active | modality | online    | 1     |
      | status=active&tag=ai                    | status   | active    | 2     |

  Scenario Outline: Paging (A-AC6)
    When the catalog client requests "<query>"
    Then the catalog responds with status 200
    And the catalog has page <page> and page size <size>
    And the catalog contains <count> courses out of 12 across <pages> pages

    Examples:
      | query             | page | size | count | pages |
      | page=1&pageSize=5 | 1    | 5    | 5     | 3     |
      | page=3&pageSize=5 | 3    | 5    | 2     | 3     |
      | page=4&pageSize=5 | 4    | 5    | 0     | 3     |
      | pageSize=50       | 1    | 50   | 12    | 1     |

  Scenario Outline: Ascending sorting (A-AC7)
    When the catalog client requests "sort=<sort>&pageSize=50"
    Then the catalog responds with status 200
    And the catalog is sorted by "<sort>"

    Examples:
      | sort      |
      | title     |
      | createdAt |
      | updatedAt |

  Scenario Outline: Invalid query parameters (A-AC8)
    When the catalog client requests "<query>"
    Then the catalog responds with status 400
    And the catalog reports an invalid query parameter "<field>"

    Examples:
      | query           | field    |
      | modality=remote | modality |
      | status=enabled  | status   |
      | page=0          | page     |
      | page=1e2        | page     |
      | pageSize=51     | pageSize |
      | pageSize=0      | pageSize |
      | sort=id         | sort     |

  Scenario: No matching courses (A-AC9)
    When the catalog client requests "q=does-not-exist"
    Then the catalog responds with status 200
    And the catalog has page 1 and page size 10
    And the catalog contains 0 courses out of 0 across 0 pages

  Scenario: Blank optional inputs use defaults
    When the catalog client requests "q=+&modality=&status=+&tag=&page=+&pageSize=&sort=+"
    Then the catalog responds with status 200
    And the catalog has page 1 and page size 10
    And the catalog contains 10 courses out of 12 across 2 pages

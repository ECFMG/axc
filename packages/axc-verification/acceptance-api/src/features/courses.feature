Feature: Course catalog search

  Scenario: Default list
    When the client requests courses with ""
    Then the course response has status 200
    And the course page has 10 items, page 1, page size 10, total 12

  Scenario Outline: Keyword searches title, summary, and tags without case sensitivity
    When the client requests courses with "<query>"
    Then the course response has status 200
    And the course results include "<id>"

    Examples:
      | query      | id         |
      | q=SECURITY | course-001 |
      | q=INCIDENT | course-005 |
      | q=COMPLIANCE | course-003 |

  Scenario Outline: Individual filters
    When the client requests courses with "<query>"
    Then the course response has status 200
    And every course has "<field>" equal to "<value>"

    Examples:
      | query             | field    | value     |
      | modality=online   | modality | online    |
      | status=active     | status   | active    |
      | tag=SECURITY      | tags     | security  |

  Scenario: Combined keyword, modality, and status
    When the client requests courses with "q=security&modality=online&status=active"
    Then the course response has status 200
    And the course results contain only "course-001"

  Scenario: Combined tag and modality
    When the client requests courses with "tag=AI&modality=hybrid"
    Then the course response has status 200
    And the course results contain only "course-011"

  Scenario: Pagination
    When the client requests courses with "page=2&pageSize=5"
    Then the course response has status 200
    And the course page has 5 items, page 2, page size 5, total 12

  Scenario: Created date sort
    When the client requests courses with "sort=createdAt&pageSize=50"
    Then the course response has status 200
    And the course results are sorted by "createdAt"

  Scenario: No matches
    When the client requests courses with "q=nonexistent"
    Then the course response has status 200
    And the course page has 0 items, page 1, page size 10, total 0

  Scenario Outline: Invalid query values
    When the client requests courses with "<query>"
    Then the course response has status 400
    And the course error identifies "<field>"

    Examples:
      | query             | field    |
      | modality=remote   | modality |
      | status=unknown    | status   |
      | page=0            | page     |
      | pageSize=51       | pageSize |
      | sort=id           | sort     |
      | extra=true        | extra    |

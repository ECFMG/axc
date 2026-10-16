Feature: Search the training catalog
  Scenario: Default catalog and course shape
    When the learner searches courses with ""
    Then the catalog has default pagination and all required course fields

  Scenario: Case insensitive keyword matches title summary and tags
    When the learner searches courses with "q=SECURITY"
    Then the matching course ids are "course-001,course-006,course-007"

  Scenario Outline: Individual and combined filters
    When the learner searches courses with "<query>"
    Then every returned course matches "<field>" equal to "<value>"
    Examples:
      | query                                      | field    | value  |
      | modality=online                            | modality | online |
      | status=active                              | status   | active |
      | tag=AI                                     | tags     | ai     |
      | q=security&modality=online&status=active     | modality | online |
      | tag=ai&status=active                        | status   | active |

  Scenario Outline: Sorting and pagination
    When the learner searches courses with "page=1&pageSize=5&sort=<sort>"
    Then at most five courses are sorted by "<sort>" with correct metadata
    Examples:
      | sort      |
      | title     |
      | createdAt |
      | updatedAt |

  Scenario Outline: Invalid catalog input
    When the learner searches courses with "<query>"
    Then the workflow responds with 400 and code "INVALID_QUERY_PARAMETER"
    Examples:
      | query           |
      | modality=remote |
      | status=pending  |
      | page=0          |
      | page=1e2        |
      | pageSize=51     |
      | sort=unknown    |

  Scenario: No matching courses
    When the learner searches courses with "q=not-a-real-course"
    Then the catalog returns an empty page

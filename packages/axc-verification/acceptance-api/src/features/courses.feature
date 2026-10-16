Feature: Course catalog acceptance
  Scenario: Default catalog pagination
    Given a training API client
    When the catalog query "" is sent
    Then the training response status is 200
    And the catalog uses default pagination
  Scenario: Keyword matches title summary and tags
    Given a training API client
    When the catalog query "q=SECURITY" is sent
    Then the training response status is 200
    And the course identifiers are "course-001,course-002,course-007,course-011"
  Scenario: Online modality filtering
    Given a training API client
    When the catalog query "modality=online" is sent
    Then the training response status is 200
    And every course has modality "online"
  Scenario: Active status filtering
    Given a training API client
    When the catalog query "status=active" is sent
    Then the training response status is 200
    And every course has status "active"
  Scenario: Exact case insensitive tag filtering
    Given a training API client
    When the catalog query "tag=AI" is sent
    Then the training response status is 200
    And the course identifiers are "course-001,course-003"
  Scenario: Combined keyword modality and status
    Given a training API client
    When the catalog query "q=security&modality=online&status=active" is sent
    Then the training response status is 200
    And the course identifiers are "course-001,course-007"
  Scenario: Combined tag modality and status
    Given a training API client
    When the catalog query "tag=ai&modality=hybrid&status=active" is sent
    Then the training response status is 200
    And the course identifiers are "course-003"
  Scenario: Explicit course pagination
    Given a training API client
    When the catalog query "page=2&pageSize=5" is sent
    Then the training response status is 200
    And the catalog page is 2 with page size 5
  Scenario Outline: Course sorting
    Given a training API client
    When the catalog query "sort=<sort>&pageSize=50" is sent
    Then the training response status is 200
    And courses are ordered by "<sort>"
    Examples:
      | sort |
      | title |
      | createdAt |
      | updatedAt |
  Scenario Outline: Invalid catalog query
    Given a training API client
    When the catalog query "<query>" is sent
    Then the training response status is 400
    And the training error is "INVALID_QUERY_PARAMETER"
    Examples:
      | query |
      | modality=invalid |
      | status=invalid |
      | sort=invalid |
      | page=0 |
      | page=abc |
      | pageSize=51 |
  Scenario: Empty catalog result
    Given a training API client
    When the catalog query "q=unmatched-value" is sent
    Then the training response status is 200
    And the course identifiers are ""

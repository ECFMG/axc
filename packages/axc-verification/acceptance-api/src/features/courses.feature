Feature: Course catalog search
  Scenario: List courses with default pagination
    When the client requests courses with ""
    Then the courses response has status 200 and default pagination

  Scenario: Search and combine filters
    When the client requests courses with "?q=SECURITY&modality=online&status=active"
    Then the courses response contains only course-001

  Scenario: Filter by tag without case sensitivity
    When the client requests courses with "?tag=AI"
    Then the courses response has three AI courses

  Scenario: Paginate and sort courses
    When the client requests courses with "?page=2&pageSize=5&sort=createdAt"
    Then the courses response is the second createdAt page

  Scenario: No courses match
    When the client requests courses with "?q=nonexistent-course"
    Then the courses response is empty

  Scenario Outline: Reject invalid query values
    When the client requests courses with "?<query>"
    Then the courses response rejects "<field>"
    Examples:
      | query              | field    |
      | modality=remote    | modality |
      | status=hidden      | status   |
      | page=0             | page     |
      | pageSize=51        | pageSize |
      | sort=relevance     | sort     |
      | unknown=value      | unknown  |

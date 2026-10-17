Feature: Course catalog and enrollment workflow

  Scenario: Search courses and reject an invalid query
    When the client requests courses with status active
    Then the course response contains active courses
    When the client requests courses with an invalid page size
    Then the API responds with status 400 and code INVALID_QUERY_PARAMETER

  Scenario: Create, retrieve, list and approve a request
    When the client creates an enrollment request
    Then the created request is pending with a history entry
    When the client retrieves the created request
    Then the API responds with status 200 and a request history
    When the client lists pending requests
    Then the API responds with status 200 and includes the created request
    When the client approves the created request
    Then the API responds with status 200 and an approval history entry
    When the client creates the same enrollment request again
    Then the API responds with status 409 and code DUPLICATE_ACTIVE_REQUEST

  Scenario: Reject invalid enrollment operations
    When the client creates a request for a missing course
    Then the API responds with status 404 and code COURSE_NOT_FOUND
    When the client creates a request with invalid email
    Then the API responds with status 400 and code INVALID_REQUEST
    When the client changes a missing request
    Then the API responds with status 404 and code ENROLLMENT_REQUEST_NOT_FOUND

  Scenario: Reject inactive courses and short justification
    When the client creates a request for an inactive course
    Then the API responds with status 409 and code COURSE_NOT_ACTIVE
    When the client creates a request with short justification
    Then the API responds with status 400 and code INVALID_REQUEST

  Scenario: Enforce duplicate and transition errors
    When the client creates an enrollment request
    Then the created request is pending with a history entry
    When the client creates the same enrollment request again
    Then the API responds with status 409 and code DUPLICATE_ACTIVE_REQUEST
    When the client rejects the created request without a reason
    Then the API responds with status 400 and code INVALID_REQUEST
    When the client approves the created request
    Then the API responds with status 200 and an approval history entry
    When the client rejects the approved request
    Then the API responds with status 409 and code INVALID_STATUS_TRANSITION

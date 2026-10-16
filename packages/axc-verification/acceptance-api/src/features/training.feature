Feature: Course search and enrollment requests

  Scenario: GET /api/courses searches and validates query parameters
    When I search courses with security search and active status
    Then the course response is 200 with security courses
    When I search courses with invalid modality
    Then the API error is 400 INVALID_QUERY_PARAMETER

  Scenario: POST, GET by ID, GET list, and PATCH expose the enrollment workflow
    When I POST a valid enrollment request
    Then the created request is 201 and pending with creation history
    When I GET the created enrollment request by ID
    Then the retrieved request is 200 with creation history
    When I GET enrollment requests filtered by learner email
    Then the list is 200 and contains the created request
    When I PATCH the created request to approved
    Then the updated request is 200 and has approval history
    When I PATCH the created request to cancelled
    Then the updated request is 200 and has cancellation history

  Scenario: Enrollment errors have the specified status and code
    When I POST an enrollment request for missing course
    Then the API error is 404 COURSE_NOT_FOUND
    When I POST an enrollment request for inactive course
    Then the API error is 409 COURSE_NOT_ACTIVE
    When I POST an enrollment request with invalid email
    Then the API error is 400 INVALID_REQUEST
    When I POST a valid enrollment request
    Then the created request is 201 and pending with creation history
    When I POST the same enrollment request again
    Then the API error is 409 DUPLICATE_ACTIVE_REQUEST
    When I PATCH the created request to rejected without reason
    Then the API error is 400 INVALID_REQUEST
    When I PATCH the created request to pending
    Then the API error is 409 INVALID_STATUS_TRANSITION
    When I GET a missing enrollment request
    Then the API error is 404 ENROLLMENT_REQUEST_NOT_FOUND

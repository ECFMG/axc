Feature: Course enrollment requests
  Learners request active courses and reviewers maintain an audit trail.

  Scenario: Create, retrieve, approve and cancel an enrollment request
    When the client requests enrollment in an active course
    Then the enrollment response has status 201
    And the enrollment request is pending with its creation history
    When the client retrieves that enrollment request
    Then the enrollment response has status 200
    And the enrollment request is pending with its creation history
    When the reviewer changes that enrollment request to "approved"
    Then the enrollment response has status 200
    And the enrollment history ends in "approved" with 2 entries
    When the client requests duplicate enrollment
    Then the enrollment response has status 409
    When the reviewer changes that enrollment request to "cancelled"
    Then the enrollment response has status 200
    And the enrollment history ends in "cancelled" with 3 entries

Feature: Enrollment requests
  A learner requests enrollment in an active course; reviewers approve, reject, or cancel the request.
  Every creation and status change is recorded in the request's statusHistory.

  Background:
    Given a learner with a unique email address

  @B-AC2 @B-AC12
  Scenario: A valid request is created as pending with a creation history entry
    When the learner requests enrollment in "AI Security Foundations"
    Then the response status is 201
    And the enrollment request has status "pending"
    And the enrollment request belongs to the learner and the course
    And the enrollment request has 1 status history entry
    And the latest status history entry moved from "none" to "pending" by "system"

  @B-AC3
  Scenario: A request for a course that does not exist is rejected
    When the learner requests enrollment in a course that does not exist
    Then the response status is 404
    And the error code is "COURSE_NOT_FOUND"

  @B-AC4
  Scenario Outline: A request for a <status> course is rejected
    When the learner requests enrollment in "<course>"
    Then the response status is 409
    And the error code is "COURSE_NOT_ACTIVE"

    Examples:
      | status  | course                           |
      | draft   | Agentic Coding Harnesses         |
      | retired | Introduction to Machine Learning |

  @B-AC5
  Scenario: An invalid learner email is rejected
    When the learner requests enrollment in "AI Security Foundations" using the email "not-an-email"
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details name the field "learnerEmail"

  @B-AC5
  Scenario: A short justification is rejected
    When the learner requests enrollment in "AI Security Foundations" with the justification "Too short."
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details name the field "justification"

  @B-AC6
  Scenario Outline: A second request while one is <status> is a duplicate
    Given the learner has a "<status>" enrollment request for "Secure Coding in TypeScript"
    When the learner requests enrollment in "Secure Coding in TypeScript"
    Then the response status is 409
    And the error code is "DUPLICATE_ACTIVE_REQUEST"

    Examples:
      | status   |
      | pending  |
      | approved |

  @B-AC6
  Scenario: A rejected request does not block a new one
    Given the learner has a "rejected" enrollment request for "Secure Coding in TypeScript"
    When the learner requests enrollment in "Secure Coding in TypeScript"
    Then the response status is 201

  @B-AC7
  Scenario: A request is retrieved by id with its status history
    Given the learner has a "approved" enrollment request for "Cloud Architecture Basics"
    When the client retrieves the enrollment request
    Then the response status is 200
    And the enrollment request has status "approved"
    And the enrollment request has 2 status history entries

  @B-AC7
  Scenario: An unknown request id returns 404
    When the client retrieves the enrollment request "650000000000000000000999"
    Then the response status is 404
    And the error code is "ENROLLMENT_REQUEST_NOT_FOUND"

  @B-AC8
  Scenario: Requests are filtered by status, courseId, and learnerEmail
    Given the learner has a "approved" enrollment request for "Domain-Driven Design Essentials"
    And the learner has a "pending" enrollment request for "Threat Modeling for Teams"
    When the client lists enrollment requests for the learner
    Then the response status is 200
    And the listed enrollment requests are for the courses "Domain-Driven Design Essentials, Threat Modeling for Teams"
    When the client lists enrollment requests for the learner with status "approved"
    Then the listed enrollment requests are for the courses "Domain-Driven Design Essentials"
    When the client lists enrollment requests for the learner in "Threat Modeling for Teams"
    Then the listed enrollment requests are for the courses "Threat Modeling for Teams"
    When the client lists enrollment requests with status "pending" in "Threat Modeling for Teams"
    Then every listed enrollment request has status "pending" and course "Threat Modeling for Teams"

  @B-AC8
  Scenario: An invalid status filter returns 400
    When the client lists enrollment requests with the query "status=open"
    Then the response status is 400
    And the error code is "INVALID_REQUEST"

  @B-AC9 @B-AC12
  Scenario Outline: Valid transitions <from> to <to> are applied and audited
    Given the learner has a "<from>" enrollment request for "Behavior-Driven Development with Cucumber"
    When a reviewer changes the enrollment request status to "<to>" with the reason "Reviewed by the training team."
    Then the response status is 200
    And the enrollment request has status "<to>"
    And the enrollment request has <entries> status history entries
    And the latest status history entry moved from "<from>" to "<to>" by "reviewer@example.org"

    Examples:
      | from     | to        | entries |
      | pending  | approved  | 2       |
      | pending  | rejected  | 2       |
      | pending  | cancelled | 2       |
      | approved | cancelled | 3       |

  @B-AC10
  Scenario Outline: Invalid transition <from> to <to> returns 409
    Given the learner has a "<from>" enrollment request for "Prompt Engineering Workshop"
    When a reviewer changes the enrollment request status to "<to>" with the reason "Attempted change."
    Then the response status is 409
    And the error code is "INVALID_STATUS_TRANSITION"

    Examples:
      | from      | to       |
      | rejected  | approved |
      | cancelled | pending  |
      | approved  | rejected |

  @B-AC11
  Scenario: Rejecting without a reason returns 400 and leaves the request unchanged
    Given the learner has a "pending" enrollment request for "AI Security Foundations"
    When a reviewer changes the enrollment request status to "rejected" without a reason
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details name the field "reason"
    When the client retrieves the enrollment request
    Then the enrollment request has status "pending"
    And the enrollment request has 1 status history entry

  @B-AC12
  Scenario: The audit trail records every change in order
    Given the learner has a "pending" enrollment request for "Cloud Architecture Basics"
    When a reviewer changes the enrollment request status to "approved" with the reason "Seat available."
    And a reviewer changes the enrollment request status to "cancelled" with the reason "Schedule conflict."
    And the client retrieves the enrollment request
    Then the status history is "none>pending, pending>approved, approved>cancelled"

  Scenario: An invalid status value returns 400
    Given the learner has a "pending" enrollment request for "Cloud Architecture Basics"
    When a reviewer changes the enrollment request status to "archived" with the reason "Not a status."
    Then the response status is 400
    And the error code is "INVALID_REQUEST"
    And the error details name the field "status"

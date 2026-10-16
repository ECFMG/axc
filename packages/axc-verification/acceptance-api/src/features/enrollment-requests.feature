Feature: Course enrollment request workflow

  Scenario: A valid enrollment request is created as pending
    When the client creates an enrollment request with:
      | courseId       | course-001                                                                 |
      | learnerEmail   | learner-create@example.org                                                 |
      | justification  | I need this course to prepare for upcoming secure development work.        |
    Then the enrollment request responds with status 201
    And the enrollment request is pending for course "course-001" and learner "learner-create@example.org"
    And the enrollment request status history starts with a pending creation entry

  Scenario: Creating a request for a missing course is rejected
    When the client creates an enrollment request with:
      | courseId       | course-missing                                                             |
      | learnerEmail   | learner-missing-course@example.org                                         |
      | justification  | I need this course to prepare for upcoming secure development work.        |
    Then the enrollment request responds with status 404
    And the enrollment request error code is "COURSE_NOT_FOUND"

  Scenario: Creating a request for a draft course is rejected
    When the client creates an enrollment request with:
      | courseId       | course-004                                                                 |
      | learnerEmail   | learner-draft-course@example.org                                           |
      | justification  | I need this course to prepare for upcoming secure development work.        |
    Then the enrollment request responds with status 409
    And the enrollment request error code is "COURSE_NOT_ACTIVE"

  Scenario: Creating a request for a retired course is rejected
    When the client creates an enrollment request with:
      | courseId       | course-005                                                                 |
      | learnerEmail   | learner-retired-course@example.org                                         |
      | justification  | I need this course to prepare for upcoming secure development work.        |
    Then the enrollment request responds with status 409
    And the enrollment request error code is "COURSE_NOT_ACTIVE"

  Scenario: Invalid learner email is rejected
    When the client creates an enrollment request with:
      | courseId       | course-001                                                                 |
      | learnerEmail   | not-an-email                                                               |
      | justification  | I need this course to prepare for upcoming secure development work.        |
    Then the enrollment request responds with status 400
    And the enrollment request error is INVALID_REQUEST for "learnerEmail"

  Scenario: Short justification is rejected
    When the client creates an enrollment request with:
      | courseId       | course-001                                                                 |
      | learnerEmail   | learner-short-justification@example.org                                    |
      | justification  | Too short.                                                                 |
    Then the enrollment request responds with status 400
    And the enrollment request error is INVALID_REQUEST for "justification"

  Scenario: Duplicate pending requests are rejected
    When the client creates an enrollment request with:
      | courseId       | course-002                                                                 |
      | learnerEmail   | learner-dup-pending@example.org                                            |
      | justification  | I need this course to prepare for upcoming secure development work.        |
    And the client creates an enrollment request with:
      | courseId       | course-002                                                                 |
      | learnerEmail   | learner-dup-pending@example.org                                            |
      | justification  | I still need this course to prepare for upcoming secure development work.  |
    Then the enrollment request responds with status 409
    And the enrollment request error code is "DUPLICATE_ACTIVE_REQUEST"

  Scenario: Duplicate approved requests are rejected
    When the client creates an enrollment request with:
      | courseId       | course-003                                                                 |
      | learnerEmail   | learner-dup-approved@example.org                                           |
      | justification  | I need this course to prepare for upcoming secure development work.        |
    And the client approves the last enrollment request as "reviewer@example.org"
    And the client creates an enrollment request with:
      | courseId       | course-003                                                                 |
      | learnerEmail   | learner-dup-approved@example.org                                           |
      | justification  | I still need this course to prepare for upcoming secure development work.  |
    Then the enrollment request responds with status 409
    And the enrollment request error code is "DUPLICATE_ACTIVE_REQUEST"

  Scenario: An existing request can be retrieved by id with status history
    When the client creates an enrollment request with:
      | courseId       | course-006                                                                 |
      | learnerEmail   | learner-get-by-id@example.org                                              |
      | justification  | I need this course to prepare for upcoming secure development work.        |
    And the client retrieves the last enrollment request by id
    Then the enrollment request responds with status 200
    And the enrollment request is pending for course "course-006" and learner "learner-get-by-id@example.org"
    And the enrollment request status history starts with a pending creation entry

  Scenario: A missing request returns not found
    When the client retrieves enrollment request "enroll-missing"
    Then the enrollment request responds with status 404
    And the enrollment request error code is "ENROLLMENT_REQUEST_NOT_FOUND"

  Scenario: Enrollment requests can be filtered by status, course, and learner
    When the client creates an enrollment request with:
      | courseId       | course-007                                                                 |
      | learnerEmail   | learner-filter-a@example.org                                               |
      | justification  | I need this course to prepare for upcoming secure development work.        |
    And the client creates an enrollment request with:
      | courseId       | course-011                                                                 |
      | learnerEmail   | learner-filter-b@example.org                                               |
      | justification  | I need this course to prepare for upcoming secure development work.        |
    And the client lists enrollment requests with:
      | status         | pending                                                                    |
      | courseId       | course-007                                                                 |
      | learnerEmail   | learner-filter-a@example.org                                               |
    Then the enrollment request responds with status 200
    And every listed enrollment request has status "pending"
    And every listed enrollment request has course "course-007"
    And every listed enrollment request has learner "learner-filter-a@example.org"

  Scenario: A pending request can be approved
    When the client creates an enrollment request with:
      | courseId       | course-012                                                                 |
      | learnerEmail   | learner-approve@example.org                                                |
      | justification  | I need this course to prepare for upcoming secure development work.        |
    And the client updates the last enrollment request status with:
      | status         | approved                                                                   |
      | changedBy      | reviewer@example.org                                                       |
    Then the enrollment request responds with status 200
    And the enrollment request has status "approved"
    And the enrollment request status history records a change to "approved" by "reviewer@example.org"

  Scenario: A pending request can be rejected with a reason
    When the client creates an enrollment request with:
      | courseId       | course-013                                                                 |
      | learnerEmail   | learner-reject@example.org                                                 |
      | justification  | I need this course to prepare for upcoming secure development work.        |
    And the client updates the last enrollment request status with:
      | status         | rejected                                                                   |
      | changedBy      | reviewer@example.org                                                       |
      | reason         | Learner has not completed the prerequisite course.                         |
    Then the enrollment request responds with status 200
    And the enrollment request has status "rejected"
    And the enrollment request status history records a change to "rejected" by "reviewer@example.org" with reason "Learner has not completed the prerequisite course."

  Scenario: A pending request can be cancelled
    When the client creates an enrollment request with:
      | courseId       | course-001                                                                 |
      | learnerEmail   | learner-cancel-pending@example.org                                         |
      | justification  | I need this course to prepare for upcoming secure development work.        |
    And the client updates the last enrollment request status with:
      | status         | cancelled                                                                  |
      | changedBy      | reviewer@example.org                                                       |
    Then the enrollment request responds with status 200
    And the enrollment request has status "cancelled"

  Scenario: An approved request can be cancelled
    When the client creates an enrollment request with:
      | courseId       | course-002                                                                 |
      | learnerEmail   | learner-cancel-approved@example.org                                        |
      | justification  | I need this course to prepare for upcoming secure development work.        |
    And the client approves the last enrollment request as "reviewer@example.org"
    And the client updates the last enrollment request status with:
      | status         | cancelled                                                                  |
      | changedBy      | reviewer@example.org                                                       |
    Then the enrollment request responds with status 200
    And the enrollment request has status "cancelled"

  Scenario: An invalid status transition is rejected
    When the client creates an enrollment request with:
      | courseId       | course-003                                                                 |
      | learnerEmail   | learner-invalid-transition@example.org                                     |
      | justification  | I need this course to prepare for upcoming secure development work.        |
    And the client approves the last enrollment request as "reviewer@example.org"
    And the client updates the last enrollment request status with:
      | status         | rejected                                                                   |
      | changedBy      | reviewer@example.org                                                       |
      | reason         | Learner has not completed the prerequisite course.                         |
    Then the enrollment request responds with status 409
    And the enrollment request error code is "INVALID_STATUS_TRANSITION"

  Scenario: Rejection without a reason is rejected
    When the client creates an enrollment request with:
      | courseId       | course-006                                                                 |
      | learnerEmail   | learner-reject-no-reason@example.org                                       |
      | justification  | I need this course to prepare for upcoming secure development work.        |
    And the client updates the last enrollment request status with:
      | status         | rejected                                                                   |
      | changedBy      | reviewer@example.org                                                       |
    Then the enrollment request responds with status 400
    And the enrollment request error is INVALID_REQUEST for "reason"

  Scenario: An invalid status value is rejected
    When the client creates an enrollment request with:
      | courseId       | course-007                                                                 |
      | learnerEmail   | learner-invalid-status@example.org                                         |
      | justification  | I need this course to prepare for upcoming secure development work.        |
    And the client updates the last enrollment request status with:
      | status         | archived                                                                   |
      | changedBy      | reviewer@example.org                                                       |
    Then the enrollment request responds with status 400
    And the enrollment request error is INVALID_REQUEST for "status"

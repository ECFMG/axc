Feature: Enrollment requests

  # ac-meta: B-AC13
  # ac-meta: B-AC14
  # ac-meta: B-AC15

  @B-AC1
  Scenario: B-AC1 Course search from Task Set A still works
    When the enrollment client requests "/api/courses"
    Then the enrollment response status is 200
    And the enrollment catalog items are not empty
    And the enrollment catalog page is 1

  @B-AC2
  Scenario: B-AC2 A valid POST /api/enrollment-requests creates a pending request
    When the enrollment client requests "/api/courses?status=active&pageSize=1"
    Then the enrollment response status is 200
    And the enrollment client remembers the first course id
    When the enrollment client posts to "/api/enrollment-requests" using the remembered course with:
      """
      {"learnerEmail":"learner-b-ac2@example.org","justification":"I need this course to prepare for upcoming secure development work."}
      """
    Then the enrollment response status is 201
    And the enrollment request status is "pending"

  @B-AC3
  Scenario: B-AC3 Creating a request for a missing course returns 404
    When the enrollment client posts json to "/api/enrollment-requests" with:
      """
      {"courseId":"course-does-not-exist-b-ac3","learnerEmail":"learner-b-ac3@example.org","justification":"I need this course to prepare for upcoming secure development work."}
      """
    Then the enrollment response status is 404
    And the enrollment error code is "COURSE_NOT_FOUND"

  @B-AC4
  Scenario: B-AC4 Creating a request for a draft or retired course returns 409
    When the enrollment client requests "/api/courses?status=draft&pageSize=1"
    Then the enrollment response status is 200
    And the enrollment client remembers the first course id
    When the enrollment client posts to "/api/enrollment-requests" using the remembered course with:
      """
      {"learnerEmail":"learner-b-ac4@example.org","justification":"I need this course to prepare for upcoming secure development work."}
      """
    Then the enrollment response status is 409
    And the enrollment error code is "COURSE_NOT_ACTIVE"

  @B-AC5
  Scenario: B-AC5 Invalid email or short justification returns 400
    When the enrollment client requests "/api/courses?status=active&pageSize=1"
    Then the enrollment response status is 200
    And the enrollment client remembers the first course id
    When the enrollment client posts to "/api/enrollment-requests" using the remembered course with:
      """
      {"learnerEmail":"not-an-email","justification":"too short"}
      """
    Then the enrollment response status is 400
    And the enrollment error code is "INVALID_REQUEST"

  @B-AC6
  Scenario: B-AC6 Duplicate pending or approved requests for the same learner/course return 409
    When the enrollment client requests "/api/courses?status=active&pageSize=1"
    Then the enrollment response status is 200
    And the enrollment client remembers the first course id
    When the enrollment client posts to "/api/enrollment-requests" using the remembered course with:
      """
      {"learnerEmail":"learner-b-ac6@example.org","justification":"I need this course to prepare for upcoming secure development work."}
      """
    Then the enrollment response status is 201
    When the enrollment client posts to "/api/enrollment-requests" using the remembered course with:
      """
      {"learnerEmail":"learner-b-ac6@example.org","justification":"I need this course to prepare for upcoming secure development work."}
      """
    Then the enrollment response status is 409
    And the enrollment error code is "DUPLICATE_ACTIVE_REQUEST"

  @B-AC7
  Scenario: B-AC7 GET /api/enrollment-requests/:id returns the request, including statusHistory
    When the enrollment client requests "/api/courses?status=active&pageSize=1"
    Then the enrollment response status is 200
    And the enrollment client remembers the first course id
    When the enrollment client posts to "/api/enrollment-requests" using the remembered course with:
      """
      {"learnerEmail":"learner-b-ac7@example.org","justification":"I need this course to prepare for upcoming secure development work."}
      """
    Then the enrollment response status is 201
    And the enrollment client remembers the request id
    When the enrollment client gets the remembered enrollment request
    Then the enrollment response status is 200
    And the enrollment request status is "pending"
    And the enrollment status history has 1 entries

  @B-AC8
  Scenario: B-AC8 GET /api/enrollment-requests supports filtering by status, courseId, and learnerEmail
    When the enrollment client requests "/api/courses?status=active&pageSize=1"
    Then the enrollment response status is 200
    And the enrollment client remembers the first course id
    When the enrollment client posts to "/api/enrollment-requests" using the remembered course with:
      """
      {"learnerEmail":"learner-b-ac8@example.org","justification":"I need this course to prepare for upcoming secure development work."}
      """
    Then the enrollment response status is 201
    When the enrollment client lists requests for learner "learner-b-ac8@example.org"
    Then the enrollment response status is 200
    And every listed enrollment request has learnerEmail "learner-b-ac8@example.org"
    When the enrollment client lists requests with status "pending"
    Then the enrollment response status is 200
    And every listed enrollment request has status "pending"
    When the enrollment client lists requests for the remembered course
    Then the enrollment response status is 200
    And every listed enrollment request has the remembered course id

  @B-AC9
  Scenario: B-AC9 PATCH /api/enrollment-requests/:id/status supports valid transitions
    When the enrollment client requests "/api/courses?status=active&pageSize=1"
    Then the enrollment response status is 200
    And the enrollment client remembers the first course id
    When the enrollment client posts to "/api/enrollment-requests" using the remembered course with:
      """
      {"learnerEmail":"learner-b-ac9a@example.org","justification":"I need this course to prepare for upcoming secure development work."}
      """
    Then the enrollment response status is 201
    And the enrollment client remembers the request id
    When the enrollment client patches the remembered request status with:
      """
      {"status":"approved","changedBy":"reviewer@example.org"}
      """
    Then the enrollment response status is 200
    And the enrollment request status is "approved"
    When the enrollment client posts to "/api/enrollment-requests" using the remembered course with:
      """
      {"learnerEmail":"learner-b-ac9b@example.org","justification":"I need this course to prepare for upcoming secure development work."}
      """
    Then the enrollment response status is 201
    And the enrollment client remembers the request id
    When the enrollment client patches the remembered request status with:
      """
      {"status":"rejected","changedBy":"reviewer@example.org","reason":"Learner has not completed the prerequisite course."}
      """
    Then the enrollment response status is 200
    And the enrollment request status is "rejected"
    When the enrollment client posts to "/api/enrollment-requests" using the remembered course with:
      """
      {"learnerEmail":"learner-b-ac9c@example.org","justification":"I need this course to prepare for upcoming secure development work."}
      """
    Then the enrollment response status is 201
    And the enrollment client remembers the request id
    When the enrollment client patches the remembered request status with:
      """
      {"status":"cancelled","changedBy":"reviewer@example.org"}
      """
    Then the enrollment response status is 200
    And the enrollment request status is "cancelled"
    When the enrollment client posts to "/api/enrollment-requests" using the remembered course with:
      """
      {"learnerEmail":"learner-b-ac9d@example.org","justification":"I need this course to prepare for upcoming secure development work."}
      """
    Then the enrollment response status is 201
    And the enrollment client remembers the request id
    When the enrollment client patches the remembered request status with:
      """
      {"status":"approved","changedBy":"reviewer@example.org"}
      """
    Then the enrollment response status is 200
    When the enrollment client patches the remembered request status with:
      """
      {"status":"cancelled","changedBy":"reviewer@example.org"}
      """
    Then the enrollment response status is 200
    And the enrollment request status is "cancelled"

  @B-AC10
  Scenario: B-AC10 Invalid transitions return 409
    When the enrollment client requests "/api/courses?status=active&pageSize=1"
    Then the enrollment response status is 200
    And the enrollment client remembers the first course id
    When the enrollment client posts to "/api/enrollment-requests" using the remembered course with:
      """
      {"learnerEmail":"learner-b-ac10@example.org","justification":"I need this course to prepare for upcoming secure development work."}
      """
    Then the enrollment response status is 201
    And the enrollment client remembers the request id
    When the enrollment client patches the remembered request status with:
      """
      {"status":"approved","changedBy":"reviewer@example.org"}
      """
    Then the enrollment response status is 200
    When the enrollment client patches the remembered request status with:
      """
      {"status":"rejected","changedBy":"reviewer@example.org","reason":"too late to reject"}
      """
    Then the enrollment response status is 409
    And the enrollment error code is "INVALID_STATUS_TRANSITION"

  @B-AC11
  Scenario: B-AC11 Rejection requires a reason
    When the enrollment client requests "/api/courses?status=active&pageSize=1"
    Then the enrollment response status is 200
    And the enrollment client remembers the first course id
    When the enrollment client posts to "/api/enrollment-requests" using the remembered course with:
      """
      {"learnerEmail":"learner-b-ac11@example.org","justification":"I need this course to prepare for upcoming secure development work."}
      """
    Then the enrollment response status is 201
    And the enrollment client remembers the request id
    When the enrollment client patches the remembered request status with:
      """
      {"status":"rejected","changedBy":"reviewer@example.org"}
      """
    Then the enrollment response status is 400
    And the enrollment error code is "INVALID_REQUEST"

  @B-AC12
  Scenario: B-AC12 Creation and every status change adds a statusHistory entry
    When the enrollment client requests "/api/courses?status=active&pageSize=1"
    Then the enrollment response status is 200
    And the enrollment client remembers the first course id
    When the enrollment client posts to "/api/enrollment-requests" using the remembered course with:
      """
      {"learnerEmail":"learner-b-ac12@example.org","justification":"I need this course to prepare for upcoming secure development work."}
      """
    Then the enrollment response status is 201
    And the enrollment status history has 1 entries
    And the first enrollment history toStatus is "pending"
    And the enrollment client remembers the request id
    When the enrollment client patches the remembered request status with:
      """
      {"status":"approved","changedBy":"reviewer@example.org"}
      """
    Then the enrollment response status is 200
    And the enrollment status history has 2 entries

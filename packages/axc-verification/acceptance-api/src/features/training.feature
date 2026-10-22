Feature: Course search and enrollment requests
  Scenario: Course search filters and rejects invalid queries
    When the training client sends GET "/api/courses?q=security&modality=online&status=active"
    Then the training response is 200 with course IDs "course-001"
    When the training client sends GET "/api/courses?pageSize=51"
    Then the training response is 400 with error "INVALID_QUERY_PARAMETER"

  Scenario: Enrollment creation validates courses and learner input
    When the training client sends POST "/api/enrollment-requests" with JSON
      """
      {"courseId":"missing","learnerEmail":"missing@example.org","justification":"A valid justification of sufficient length."}
      """
    Then the training response is 404 with error "COURSE_NOT_FOUND"
    When the training client sends POST "/api/enrollment-requests" with JSON
      """
      {"courseId":"course-003","learnerEmail":"draft@example.org","justification":"A valid justification of sufficient length."}
      """
    Then the training response is 409 with error "COURSE_NOT_ACTIVE"
    When the training client sends POST "/api/enrollment-requests" with JSON
      """
      {"courseId":"course-001","learnerEmail":"bad@","justification":"Too short"}
      """
    Then the training response is 400 with error "INVALID_REQUEST"

  Scenario: Enrollment workflow exposes retrieval, filtering, transitions and audit history
    When the training client sends POST "/api/enrollment-requests" with JSON
      """
      {"courseId":"course-001","learnerEmail":"workflow@example.org","justification":"I need this course for secure development work."}
      """
    Then the training response is 201 with status "pending" and 1 history entries
    When the training client sends GET "/api/enrollment-requests/$requestId"
    Then the training response is 200 with status "pending" and 1 history entries
    When the training client sends GET "/api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=workflow@example.org"
    Then the training response is 200 with 1 enrollment items
    When the training client sends POST "/api/enrollment-requests" with JSON
      """
      {"courseId":"course-001","learnerEmail":"workflow@example.org","justification":"I need this course for secure development work."}
      """
    Then the training response is 409 with error "DUPLICATE_ACTIVE_REQUEST"
    When the training client sends PATCH "/api/enrollment-requests/$requestId/status" with JSON
      """
      {"status":"approved","changedBy":"reviewer@example.org"}
      """
    Then the training response is 200 with status "approved" and 2 history entries
    When the training client sends PATCH "/api/enrollment-requests/$requestId/status" with JSON
      """
      {"status":"rejected","changedBy":"reviewer@example.org"}
      """
    Then the training response is 400 with error "INVALID_REQUEST"
    When the training client sends PATCH "/api/enrollment-requests/$requestId/status" with JSON
      """
      {"status":"cancelled","changedBy":"reviewer@example.org"}
      """
    Then the training response is 200 with status "cancelled" and 3 history entries
    When the training client sends PATCH "/api/enrollment-requests/$requestId/status" with JSON
      """
      {"status":"approved","changedBy":"reviewer@example.org"}
      """
    Then the training response is 409 with error "INVALID_STATUS_TRANSITION"

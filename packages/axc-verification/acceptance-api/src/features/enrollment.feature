Feature: Enrollment request workflow
  Scenario: A learner requests an active course and a reviewer cancels approval
    When the client completes the enrollment workflow through the running API
    Then the enrollment workflow has three audit entries

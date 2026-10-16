Feature: Enrollment request invariants
  Scenario: Creation validates the course and learner details
    Then creation enforces course eligibility and all input boundaries
  Scenario: Status changes follow the complete transition matrix
    Then all status pairs enforce transitions and preserve audit entries
  Scenario: Audit details are validated and snapshots are isolated
    Then reviewer and rejection reason are required and history cannot be mutated through snapshots

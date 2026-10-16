Feature: Enrollment public record
  Scenario: Audit entries expose only public fields
    Given an enrollment with persistence metadata on a history entry
    When the enrollment is converted to a public record
    Then the record serializes without persistence metadata

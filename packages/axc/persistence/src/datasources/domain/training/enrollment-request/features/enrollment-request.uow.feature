Feature: Atomic enrollment persistence
  Scenario: Requests survive reads and filters
    Then request snapshots and audit entries round trip and every filter is applied
  Scenario: Active uniqueness and concurrent changes are enforced
    Then concurrent creates and stale updates cannot violate enrollment invariants
  Scenario: Failed operations do not commit
    Then a callback failure leaves storage unchanged

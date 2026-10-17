Feature: Course search orchestration
  Scenario: Pass typed criteria to the read repository
    When the catalog is searched with typed criteria
    Then the read repository receives the criteria and its result is returned

  Scenario: Propagate repository failure
    When the read repository cannot search the catalog
    Then the application service rejects with that failure

Feature: Course search application service
  Scenario: Delegates typed criteria to the read repository
    Given a course read repository
    When the application searches the catalog
    Then the repository result is returned unchanged

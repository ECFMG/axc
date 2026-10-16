Feature: MongoDB training persistence
  Scenario: Seed contains a mixed catalog
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Mongo keyword matches all searchable fields
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Mongo combines filters
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Mongo sorts by title
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Mongo sorts by createdAt
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Mongo sorts by updatedAt
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Mongo pagination uses skip limit and count
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Mongo treats regex symbols literally
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Mongo treats tag symbols literally
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Mongo looks up known course
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Mongo returns undefined for absent course
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Transaction persists creation history
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Transaction prevents duplicate pending requests
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Transaction prevents duplicate approved requests
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Concurrent creation has one winner
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Terminal cancelled releases duplicate constraint
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Terminal rejected releases duplicate constraint
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Concurrent status changes do not lose history
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Failed transaction rolls back creation
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Failed status transaction rolls back audit
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Mongo filters enrollment status
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Mongo filters enrollment courseId
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Mongo filters enrollment learnerEmail
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Mongo combines enrollment filters
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Mongo empty enrollment lookup
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct
  Scenario: Mongo empty enrollment list
    Given initialized sample persistence
    When the repository operation runs
    Then the database result is correct

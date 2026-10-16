Feature: Course HTTP query mapping

  Scenario: defaults
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: trims optional input
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: blank values use defaults
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: combined criteria
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: maximum size
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: accepts modality online
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: accepts modality in-person
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: accepts modality hybrid
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: accepts status draft
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: accepts status active
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: accepts status retired
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: accepts sort title
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: accepts sort createdAt
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: accepts sort updatedAt
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects modality remote
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects modality ONLINE
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects status pending
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects status ACTIVE
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects sort id
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects sort -title
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects page 0
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects page -1
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects page 1.5
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects page abc
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects page 1e2
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects page 0x10
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects page 9007199254740992
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects pageSize 0
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects pageSize 51
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects pageSize -1
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects pageSize 1.1
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects pageSize abc
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: rejects pageSize 1e1
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: minimum size
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: largest page
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: unknown query ignored
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: first repeated parameter wins
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

  Scenario: leading zero integer
    Given a course application service
    When the catalog request is sent
    Then the query is mapped consistently

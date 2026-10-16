Feature: MongoDB course catalog search

  Scenario: keyword in title
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: keyword in summary
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: keyword in tags
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: tag exact case insensitive
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: tag is not substring
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: keyword literal regex
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: tag literal regex
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: regex does not match everything
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: combines keyword modality status
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: combines tag status
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: page two
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: past last page
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: no match
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: created ascending
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: updated ascending
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: title default
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: filters modality online
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: filters modality in-person
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: filters modality hybrid
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: filters status draft
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: filters status active
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

  Scenario: filters status retired
    Given twelve catalog courses in MongoDB
    When the catalog is searched
    Then the matching course identifiers are returned

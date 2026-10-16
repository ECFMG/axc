Feature: Mongo course search
  Scenario: Combined search filters run before paging
    Given twelve mixed courses in MongoDB
    When active online security courses are searched
    Then only matching courses and their total are returned
  Scenario: Search treats regex characters literally
    Given twelve mixed courses in MongoDB
    When the keyword is ".*"
    Then zero courses match the literal keyword
  Scenario: Paging and date sorting run in MongoDB
    Given twelve mixed courses in MongoDB
    When page 2 of size 3 is sorted by createdAt
    Then three dated courses and total 12 are returned

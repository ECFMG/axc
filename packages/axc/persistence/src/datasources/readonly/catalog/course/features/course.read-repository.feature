Feature: MongoDB course search
 Scenario: Seeded course contract
  Then the seed contains a varied valid catalog and seeds idempotently
 Scenario: Keywords and literal matching
  Then keywords match each searchable field case insensitively and escape metacharacters
 Scenario: Filters and combinations
  Then all enum values and exact tags can be combined with keywords
 Scenario: Sorting and pagination
  Then MongoDB sorts and pages matching courses with stable ties

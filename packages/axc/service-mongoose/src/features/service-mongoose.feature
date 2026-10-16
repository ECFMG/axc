Feature: Mongoose infrastructure lifecycle
 Scenario: Local database lifecycle
  Then local startup uses MongoDB 7.0.14 and shutdown releases it
 Scenario: Configured database lifecycle
  Then configured startup uses the supplied URI
 Scenario: Connection failure cleanup
  Then failed startup closes the local database and can be retried

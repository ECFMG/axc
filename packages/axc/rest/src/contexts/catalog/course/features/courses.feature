Feature: Course HTTP search
 Scenario: Defaults and blank optional parameters
  Then defaults and blanks produce typed criteria
 Scenario: Accepted query values
  Then every supported filter and sort is forwarded
 Scenario: Invalid queries
  Then invalid enum and numeric formats return consistent errors
 Scenario: HTTP results and failures
  Then course pages and safe internal errors are mapped

Feature: Course HTTP query contract

  Scenario: Default list
    When courses are requested with query ""
    Then the response status is 200 for "defaults"

  Scenario: Keyword is trimmed
    When courses are requested with query "q=%20Security%20"
    Then the response status is 200 for "keyword"

  Scenario: Online modality
    When courses are requested with query "modality=online"
    Then the response status is 200 for "online"

  Scenario: In person modality
    When courses are requested with query "modality=in-person"
    Then the response status is 200 for "in-person"

  Scenario: Hybrid modality
    When courses are requested with query "modality=hybrid"
    Then the response status is 200 for "hybrid"

  Scenario: Draft status
    When courses are requested with query "status=draft"
    Then the response status is 200 for "draft"

  Scenario: Active status
    When courses are requested with query "status=active"
    Then the response status is 200 for "active"

  Scenario: Retired status
    When courses are requested with query "status=retired"
    Then the response status is 200 for "retired"

  Scenario: Tag query
    When courses are requested with query "tag=AI"
    Then the response status is 200 for "tag"

  Scenario: Page two
    When courses are requested with query "page=2&pageSize=5"
    Then the response status is 200 for "paging"

  Scenario: Maximum page size
    When courses are requested with query "pageSize=50"
    Then the response status is 200 for "maximum"

  Scenario: Created sorting
    When courses are requested with query "sort=createdAt"
    Then the response status is 200 for "createdAt"

  Scenario: Updated sorting
    When courses are requested with query "sort=updatedAt"
    Then the response status is 200 for "updatedAt"

  Scenario: Title sorting
    When courses are requested with query "sort=title"
    Then the response status is 200 for "title"

  Scenario: Blank optional input
    When courses are requested with query "q=%20&tag=%20&modality=%20&status=&page=&pageSize=&sort="
    Then the response status is 200 for "defaults"

  Scenario: Reject modality remote
    When courses are requested with query "modality=remote"
    Then the response status is 400 for "modality"

  Scenario: Reject status published
    When courses are requested with query "status=published"
    Then the response status is 400 for "status"

  Scenario: Reject sort -title
    When courses are requested with query "sort=-title"
    Then the response status is 400 for "sort"

  Scenario: Reject page 0
    When courses are requested with query "page=0"
    Then the response status is 400 for "page"

  Scenario: Reject page -1
    When courses are requested with query "page=-1"
    Then the response status is 400 for "page"

  Scenario: Reject page 1.5
    When courses are requested with query "page=1.5"
    Then the response status is 400 for "page"

  Scenario: Reject page abc
    When courses are requested with query "page=abc"
    Then the response status is 400 for "page"

  Scenario: Reject page 1e2
    When courses are requested with query "page=1e2"
    Then the response status is 400 for "page"

  Scenario: Reject page 9007199254740992
    When courses are requested with query "page=9007199254740992"
    Then the response status is 400 for "page"

  Scenario: Reject pageSize 0
    When courses are requested with query "pageSize=0"
    Then the response status is 400 for "pageSize"

  Scenario: Reject pageSize -1
    When courses are requested with query "pageSize=-1"
    Then the response status is 400 for "pageSize"

  Scenario: Reject pageSize 51
    When courses are requested with query "pageSize=51"
    Then the response status is 400 for "pageSize"

  Scenario: Reject pageSize 1.5
    When courses are requested with query "pageSize=1.5"
    Then the response status is 400 for "pageSize"

  Scenario: Reject pageSize abc
    When courses are requested with query "pageSize=abc"
    Then the response status is 400 for "pageSize"

  Scenario: Reject pageSize 1e1
    When courses are requested with query "pageSize=1e1"
    Then the response status is 400 for "pageSize"

  Scenario: Minimum page size
    When courses are requested with query "pageSize=1"
    Then the response status is 200 for "minimum"

  Scenario: Unsafe pagination offset
    When courses are requested with query "page=9007199254740991&pageSize=50"
    Then the response status is 400 for "page"

  Scenario: Storage error is sanitized
    When courses are requested with query "failure=yes"
    Then the response status is 500 for "failure"


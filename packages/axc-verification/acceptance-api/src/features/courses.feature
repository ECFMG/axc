Feature: Course catalog search

  Scenario Outline: Catalog queries are served by the Functions host
    When the client requests courses with query "<query>"
    Then the courses response has status <status>
    And the courses response satisfies "<contract>"

    Examples:
      | query                                            | status | contract   |
      |                                                  | 200    | defaults   |
      | q=SeCuRiTy                                       | 200    | security   |
      | modality=online                                  | 200    | online     |
      | status=active                                    | 200    | active     |
      | tag=AI                                           | 200    | ai         |
      | q=security&modality=online&status=active           | 200    | combined   |
      | tag=ai&modality=hybrid&status=active               | 200    | combined2  |
      | page=1&pageSize=5                                 | 200    | pagination |
      | sort=createdAt                                   | 200    | createdAt  |
      | sort=updatedAt                                   | 200    | updatedAt  |
      | q=does-not-exist                                  | 200    | empty      |
      | modality=bad                                     | 400    | error      |
      | status=bad                                       | 400    | error      |
      | page=0                                           | 400    | error      |
      | pageSize=51                                      | 400    | error      |
      | sort=bad                                         | 400    | error      |

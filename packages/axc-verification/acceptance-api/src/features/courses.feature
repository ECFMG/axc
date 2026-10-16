Feature: Course catalog search
 Scenario: Default list
  When the catalog client requests "/api/courses"
  Then the catalog has default pagination and the course contract

 Scenario Outline: Catalog filtering
  When the catalog client requests "<path>"
  Then the catalog contains exactly "<ids>"
  Examples:
   | path | ids |
   | /api/courses?q=security | course-001,course-002,course-003,course-009 |
   | /api/courses?q=SeCuRiTy | course-001,course-002,course-003,course-009 |
   | /api/courses?modality=online | course-001,course-002,course-006,course-008 |
   | /api/courses?status=active | course-001,course-002,course-004,course-005,course-008,course-009 |
   | /api/courses?tag=AI | course-001,course-003,course-005,course-012 |
   | /api/courses?q=security&modality=online&status=active | course-001,course-002 |
   | /api/courses?modality=hybrid&tag=ai | course-003,course-005,course-012 |
   | /api/courses?q=unmatched-query | |

 Scenario: Explicit pagination
  When the catalog client requests "/api/courses?page=2&pageSize=5"
  Then the catalog has the second page of five courses

 Scenario Outline: Sorting
  When the catalog client requests "/api/courses?sort=<sort>"
  Then the catalog is sorted by "<sort>"
  Examples:
   | sort |
   | title |
   | createdAt |
   | updatedAt |

 Scenario Outline: Invalid queries
  When the catalog client requests "/api/courses?<field>=<value>"
  Then the catalog rejects field "<field>" consistently
  Examples:
   | field | value |
   | modality | remote |
   | status | published |
   | page | 0 |
   | page | 1x |
   | pageSize | 51 |
   | pageSize | 0 |
   | sort | id |

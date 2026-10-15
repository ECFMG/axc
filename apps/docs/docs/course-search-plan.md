# Course search implementation and verification map

Task: TS-A-CATALOG-SEARCH. Base: `15246035f88cf09627870dc0faae0fcbc4a4322a`.

| Requirements / acceptance | CellixJS implementation | Proof |
| --- | --- | --- |
| 1: Course fields | domain `domain/contexts/catalog/course/course.ts`, `course.value-objects.ts`; Domain namespace | persistence fixture shape test, acceptance default response |
| 2: 12 mixed fixtures | persistence `fixtures/courses.ts` | repository fixture test |
| 3, A1, AC1 | rest `contexts/catalog/course/index.ts`; apps/api registration and required dataSources | route unit test; default acceptance scenario |
| 4, A2–A3, AC2 | application-services `contexts/catalog/course/query-courses.ts` | keyword title/summary/tags tests; keyword acceptance |
| 5–7, A4–A6, AC3–5 | same operation; domain allowed values | each enum/tag and two combined filter tests and acceptance scenarios |
| 8, A7, AC6 | rest parser defaults/strict integer limits; application operation slicing/counts | parser boundary tests; operation pages; acceptance pagination |
| 9, A8, AC7 | domain sort values; application operation ascending sorting, ID tie break | all sort fields and ties tests; acceptance sorting |
| 10, A9, AC8 | rest `course-query.ts` consistent error mapping | enum, integer format/range, repeated and unknown key tests; invalid acceptance scenarios |
| 11, A10, AC9–11 | colocated unit tests; acceptance-api courses scenarios | empty results, two filter combinations, full existing test suite |
| 12, A11, AC12 | docs `courses.md`, sidebar entry | documented path, all parameters, response examples |

Decisions: substring keyword search, exact tag matching, ascending sorting with ID tie break, zero totalPages for no matches, empty optional parameters omitted. Non-empty enum/numeric values must match strictly; unknown and repeated query parameters return 400. Pages beyond the result set return empty items with unchanged totals.

Wiring: domain owns types/constants; persistence supplies a snapshot read repository through required DataSources; application services own search/filter/sort/pagination; rest owns raw query validation and HTTP responses; apps/api constructs data sources once. No database or external service needed. Workspace dependencies and existing Vitest tooling are required for these layer connections and colocated tests; no new third-party library.

# Course catalog search reads the Course collection

* Status: accepted
* Date: 2026-10-16

## Context and Problem Statement

Training users need to search courses by keyword and narrow the list by modality, status, and tag. The API must page and sort that list, reject invalid query parameters, and keep the catalog in the database rather than in a handler.

## Decision Drivers

* The endpoint is a read, so it belongs on the Cellix read model.
* Query validation belongs at the HTTP boundary so invalid input never reaches the query.
* Seed data must be inserted into MongoDB and read back through `GET /api/courses`.

## Considered Options

* Filter an in-memory array inside the REST handler.
* Read Course documents through `readonlyDataSource.Course.Course.CourseReadRepo.search`.

## Decision Outcome

Chosen option: "Read Course documents through the read repository", because the catalog stays in MongoDB and the REST handler only calls `applicationServices.Course.Course.query`.

`GET /api/courses` accepts `q`, `modality`, `status`, `tag`, `page`, `pageSize`, and `sort`. Invalid parameters return HTTP 400 with code `INVALID_QUERY_PARAMETER`. No matches return HTTP 200 and an empty `items` array.

## Consequences

* The API starts a local MongoDB process and inserts `courseSeed` before the first request.
* Catalog data lasts for the life of that process.
* Adding another course field means updating the Course aggregate, the mongoose model, and `courseSeed` together.

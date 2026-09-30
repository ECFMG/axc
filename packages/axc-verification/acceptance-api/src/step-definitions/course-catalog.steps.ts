import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CourseItem {
	id: string;
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

interface CourseCatalogResponse {
	items: CourseItem[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface InvalidQueryResponse {
	error: {
		code: string;
		message: string;
		details: Array<{ field: string; message: string }>;
	};
}

const actor = () => actorCalled('API client');

const catalogValue = <T>(description: string, value: (body: CourseCatalogResponse) => T) =>
	Question.about(description, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseCatalogResponse>());
		return value(body);
	});

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client requests courses with query {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course catalog metadata is page {int}, page size {int}, {int} total items, and {int} total pages', (page: number, pageSize: number, totalItems: number, totalPages: number) =>
	actor().attemptsTo(
		Ensure.that(resolved(catalogValue('the catalog page', (body) => body.page)), equals(page)),
		Ensure.that(resolved(catalogValue('the catalog page size', (body) => body.pageSize)), equals(pageSize)),
		Ensure.that(resolved(catalogValue('the catalog total items', (body) => body.totalItems)), equals(totalItems)),
		Ensure.that(resolved(catalogValue('the catalog total pages', (body) => body.totalPages)), equals(totalPages)),
	),
);

Then('the course catalog contains at most {int} items', (maximum: number) =>
	actor().attemptsTo(Ensure.that(resolved(catalogValue('the catalog item count is within the page size', (body) => body.items.length <= maximum)), equals(true))),
);

Then('the returned course IDs are {string}', (expectedIds: string) =>
	actor().attemptsTo(Ensure.that(resolved(catalogValue('the returned course IDs', (body) => body.items.map((course) => course.id).join(','))), equals(expectedIds))),
);

Then('every returned course has {word} {string}', (field: 'modality' | 'status', expected: string) =>
	actor().attemptsTo(Ensure.that(resolved(catalogValue(`every returned course has ${field} ${expected}`, (body) => body.items.every((course) => course[field] === expected))), equals(true))),
);

Then('the returned courses are sorted by createdAt', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				catalogValue('the returned courses are sorted by createdAt', (body) => {
					const values = body.items.map((course) => course.createdAt);
					return values.every((value, index) => index === 0 || (values[index - 1] ?? '') <= value);
				}),
			),
			equals(true),
		),
	),
);

Then('the invalid query response identifies {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the invalid query error contract', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<InvalidQueryResponse>());
					return body.error.code === 'INVALID_QUERY_PARAMETER' && body.error.message === 'One or more query parameters are invalid.' && body.error.details.some((detail) => detail.field === field);
				}),
			),
			equals(true),
		),
	),
);

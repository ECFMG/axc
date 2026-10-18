import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

interface Course {
	id: string;
	title: string;
	createdAt: string;
	updatedAt: string;
}
interface CatalogResult {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;
const actor = () => actorCalled('API client');
When('the client requests courses at {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));
Then('the courses response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));
Then('the catalog metadata is page {int}, size {int}, total {int}, pages {int}, items {int}', (page: number, pageSize: number, totalItems: number, totalPages: number, count: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('catalog pagination', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CatalogResult>());
					return { page: body.page, pageSize: body.pageSize, totalItems: body.totalItems, totalPages: body.totalPages, count: body.items.length };
				}),
			),
			equals({ page, pageSize, totalItems, totalPages, count }),
		),
	),
);
Then('the catalog course ids are {string}', (ids: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('catalog ids', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CatalogResult>());
					return body.items.map((item) => item.id).join(',');
				}),
			),
			equals(ids),
		),
	),
);
Then('the catalog is sorted by {string}', (sort: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('catalog order', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CatalogResult>());
					const values = body.items.map((item) => item[sort as 'title' | 'createdAt' | 'updatedAt']);
					return values.length > 0 && JSON.stringify(values) === JSON.stringify([...values].sort((a, b) => a.localeCompare(b)));
				}),
			),
			equals(true),
		),
	),
);
Then('the catalog error identifies {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('catalog validation error', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<{ error: { code: string; message: string; details: { field: string; message: string }[] } }>());
					return body.error.code === 'INVALID_QUERY_PARAMETER' && body.error.message === 'One or more query parameters are invalid.' && body.error.details.some((detail) => detail.field === field && detail.message.length > 0);
				}),
			),
			equals(true),
		),
	),
);

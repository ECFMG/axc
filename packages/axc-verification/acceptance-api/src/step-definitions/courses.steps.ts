import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;
const actor = () => actorCalled('API client');
interface CatalogResponse {
	items: { id: string }[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
	error: { code: string; message: string; details: { field: string; message: string }[] };
}
const inspect = <T>(description: string, read: (body: CatalogResponse) => T) => Question.about(description, async (currentActor) => read(await currentActor.answer(LastResponse.body<CatalogResponse>())));
When('the catalog client requests {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses${query}`))));
Then('the catalog status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));
Then('the catalog ids are {string}', (ids: string) => actor().attemptsTo(Ensure.that(resolved(inspect('course ids', (body) => body.items.map((c) => c.id).join(','))), equals(ids))));
Then('the catalog contains {int} items with page {int} size {int} total {int} pages {int}', (count: number, page: number, pageSize: number, totalItems: number, totalPages: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(inspect('pagination metadata', (body) => ({ count: body.items.length, page: body.page, pageSize: body.pageSize, totalItems: body.totalItems, totalPages: body.totalPages }))),
			equals({ count, page, pageSize, totalItems, totalPages }),
		),
	),
);
Then('the catalog error identifies {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(resolved(inspect('error code', (body) => body.error.code)), equals('INVALID_QUERY_PARAMETER')),
		Ensure.that(resolved(inspect('error message', (body) => body.error.message)), equals('One or more query parameters are invalid.')),
		Ensure.that(resolved(inspect('invalid field detail', (body) => body.error.details.some((detail) => detail.field === field && detail.message.length > 0))), equals(true)),
	),
);

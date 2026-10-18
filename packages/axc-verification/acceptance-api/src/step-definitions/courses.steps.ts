import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(value: Answerable<Promise<T>>): Answerable<T> => value as unknown as Answerable<T>;
interface Result {
	items: { id: string; createdAt: string }[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
	error?: { code: string; message: string; details: { field: string; message: string }[] };
}
When('the client requests courses with query {string}', (query: string) => actorCalled('API client').attemptsTo(Send.a(GetRequest.to(`/api/courses${query}`))));
Then('the courses response has status {int}', (status: number) => actorCalled('API client').attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));
Then('the course ids are {string}', (ids: string) =>
	actorCalled('API client').attemptsTo(
		Ensure.that(
			resolved(
				Question.about('course ids', async (actor) => {
					const body = await actor.answer(LastResponse.body<Result>());
					return body.items.map((course) => course.id).join(',');
				}),
			),
			equals(ids),
		),
	),
);
Then('the courses metadata is page {int} size {int} total {int} pages {int}', (page: number, pageSize: number, totalItems: number, totalPages: number) =>
	actorCalled('API client').attemptsTo(
		Ensure.that(
			resolved(
				Question.about('pagination', async (actor) => {
					const body = await actor.answer(LastResponse.body<Result>());
					return { page: body.page, pageSize: body.pageSize, totalItems: body.totalItems, totalPages: body.totalPages };
				}),
			),
			equals({ page, pageSize, totalItems, totalPages }),
		),
	),
);
Then('the courses error identifies {string}', (field: string) =>
	actorCalled('API client').attemptsTo(
		Ensure.that(
			resolved(
				Question.about('query error', async (actor) => {
					const body = await actor.answer(LastResponse.body<Result>());
					return body.error?.code === 'INVALID_QUERY_PARAMETER' && body.error.message === 'One or more query parameters are invalid.' && body.error.details.some((detail) => detail.field === field && detail.message.length > 0);
				}),
			),
			equals(true),
		),
	),
);

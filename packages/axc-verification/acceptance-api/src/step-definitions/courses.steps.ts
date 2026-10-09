import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;
const actor = () => actorCalled('API client');

When('the client requests courses with query {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses${query ? `?${query}` : ''}`))));
Then('the courses respond with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));
Then('the courses contain {int} items with {int} total matches on page {int} of size {int}', (items: number, total: number, page: number, size: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('catalog pagination', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<{ items: unknown[]; totalItems: number; totalPages: number; page: number; pageSize: number }>());
					return [body.items.length, body.totalItems, body.totalPages, body.page, body.pageSize];
				}),
			),
			equals([items, total, Math.ceil(total / size), page, size]),
		),
	),
);
Then('the courses return an invalid query error', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('catalog validation error', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<{ error: { code: string; details: { field: string }[] } }>());
					return [body.error.code, ...body.error.details.map((detail) => detail.field)];
				}),
			),
			equals(['INVALID_QUERY_PARAMETER', 'pageSize']),
		),
	),
);

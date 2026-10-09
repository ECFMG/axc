import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;
const actor = () => actorCalled('API client');

When('the client requests catalog path {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));
Then('the catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));
Then('the catalog response has {int} items and {int} total matches', (count: number, total: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the catalog item count and total', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<{ items: unknown[]; totalItems: number }>());
					return [body.items.length, body.totalItems];
				}),
			),
			equals([count, total]),
		),
	),
);
Then('the catalog response contains a query validation error', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the catalog validation code', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<{ error: { code: string } }>());
					return body.error.code;
				}),
			),
			equals('INVALID_QUERY_PARAMETER'),
		),
	),
);

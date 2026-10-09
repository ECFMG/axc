import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;
const actor = () => actorCalled('Catalog client');

When('the catalog client requests {string}', (url: string) => actor().attemptsTo(Send.a(GetRequest.to(url))));

Then('the catalog response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the catalog response contains {int} items and {int} total matches', (count: number, total: number) => {
	const itemCount = Question.about('catalog page item count', async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<{ items: unknown[] }>());
		return body.items.length;
	});
	const totalItems = Question.about('catalog total matches', async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<{ totalItems: number }>());
		return body.totalItems;
	});
	return actor().attemptsTo(Ensure.that(resolved(itemCount), equals(count)), Ensure.that(resolved(totalItems), equals(total)));
});

Then('the catalog response reports an invalid query parameter', () => {
	const errorCode = Question.about('catalog validation error code', async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<{ error: { code: string } }>());
		return body.error.code;
	});
	return actor().attemptsTo(Ensure.that(resolved(errorCode), equals('INVALID_QUERY_PARAMETER')));
});

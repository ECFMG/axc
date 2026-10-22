import { Then } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

const actor = () => actorCalled('API client');

interface ErrorBody {
	error: {
		code: string;
		message: string;
		details: { field: string; message: string }[];
	};
}

const errorCode = Question.about('the error code', async (current) => {
	const body = await current.answer(LastResponse.body<ErrorBody>());
	return body.error.code;
});

const errorHasField = (field: string) =>
	Question.about(`the error details include ${field}`, async (current) => {
		const body = await current.answer(LastResponse.body<ErrorBody>());
		return body.error.details.some((detail) => detail.field === field);
	});

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(errorCode), equals(code))));

Then('the error details include field {string}', (field: string) => actor().attemptsTo(Ensure.that(resolved(errorHasField(field)), equals(true))));

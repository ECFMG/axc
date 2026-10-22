import { Then } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

const actor = () => actorCalled('API client');

interface ErrorBody {
	error?: {
		code?: string;
		details?: readonly { field?: string }[];
	};
}

const errorCode = () =>
	Question.about('the error code', async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<ErrorBody>());
		return body.error?.code ?? '';
	});

const errorDetailsInclude = (field: string) =>
	Question.about(`whether error details include ${field}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<ErrorBody>());
		return (body.error?.details ?? []).some((detail) => detail.field === field);
	});

Then('the error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(errorCode()), equals(code))));

Then('the error details include {string}', (field: string) => actor().attemptsTo(Ensure.that(resolved(errorDetailsInclude(field)), equals(true))));

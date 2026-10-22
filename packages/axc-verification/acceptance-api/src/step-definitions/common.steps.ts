import { Then } from '@cucumber/cucumber';
import { contain, Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

// Response checks shared by the course and enrollment request features.

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface ErrorBody {
	error?: { code?: string; details?: Array<{ field: string }> };
}

const actor = () => actorCalled('API client');

const errorCode = Question.about('the error code', async (currentActor) => (await currentActor.answer(LastResponse.body<ErrorBody>())).error?.code);

const errorFields = Question.about('the fields named in the error details', async (currentActor) => ((await currentActor.answer(LastResponse.body<ErrorBody>())).error?.details ?? []).map((detail) => detail.field));

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(errorCode), equals(code))));

Then('the error details name the field {string}', (field: string) => actor().attemptsTo(Ensure.that(resolved(errorFields), contain(field))));

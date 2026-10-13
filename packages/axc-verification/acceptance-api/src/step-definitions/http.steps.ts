import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isGreaterThan, isTrue } from '@serenity-js/assertions';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

/** Shared HTTP steps for the course-search and enrollment-requests features. */
export const actor = () => actorCalled('API client');

export interface ErrorBody {
	error: { code: string; message: string; details: { field: string; message: string }[] };
}

export const lastBody = <T>() => actor().answer(LastResponse.body<T>()) as Promise<T>;

/** Id of the most recently created enrollment request; substituted for `{id}` in paths. */
export const created = { id: '' };

When('the client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path.replace('{id}', created.id)))));

Then('the response status is {int}', async (status: number) => actor().attemptsTo(Ensure.that((await actor().answer(LastResponse.status())) as number, equals(status))));

Then('the error code is {string}', async (code: string) => actor().attemptsTo(Ensure.that((await lastBody<ErrorBody>()).error.code, equals(code))));

Then('the error has a message and details for {string}', async (field: string) => {
	const { error } = await lastBody<ErrorBody>();
	await actor().attemptsTo(
		Ensure.that(error.message.length, isGreaterThan(0)),
		Ensure.that(
			error.details.some((d) => d.field === field && d.message.length > 0),
			isTrue(),
		),
	);
});

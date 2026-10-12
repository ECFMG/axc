import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, PatchRequest, PostRequest, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

const actor = () => actorCalled('API client');

/** Ids created during a scenario, so later steps can address the request they just made. */
const remembered = new Map<string, string>();

const withRemembered = (path: string): string => path.replace(/\{(\w+)\}/g, (match, name: string) => remembered.get(name) ?? match);

/** Reads `items.0.statusHistory.1.toStatus` style paths out of the last response body. */
const field = (path: string) =>
	Question.about(`the response field ${path}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<unknown>());
		return path.split('.').reduce<unknown>((value, segment) => (value === null || value === undefined ? value : (value as Record<string, unknown>)[segment]), body);
	});

const text = (path: string) => Question.about(`the response field ${path} as text`, async (currentActor) => String(await currentActor.answer(field(path))));

const numberAt = (path: string) => Question.about(`the response field ${path} as a number`, async (currentActor) => Number(await currentActor.answer(field(path))));

const count = (path: string) =>
	Question.about(`the number of entries in ${path}`, async (currentActor) => {
		const value = await currentActor.answer(field(path));
		return Array.isArray(value) ? value.length : -1;
	});

When('the client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(withRemembered(path)))));

When('the client posts to {string} with:', (path: string, body: string) => actor().attemptsTo(Send.a(PostRequest.to(withRemembered(path)).with(JSON.parse(body) as unknown))));

When('the client patches {string} with:', (path: string, body: string) => actor().attemptsTo(Send.a(PatchRequest.to(withRemembered(path)).with(JSON.parse(body) as unknown))));

When('the client remembers the response {string} as {string}', async (path: string, name: string) => {
	remembered.set(name, await actor().answer(text(path)));
});

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the response {string} is {string}', (path: string, expected: string) => actor().attemptsTo(Ensure.that(resolved(text(path)), equals(expected))));

Then('the response {string} is {int}', (path: string, expected: number) => actor().attemptsTo(Ensure.that(resolved(numberAt(path)), equals(expected))));

Then('the response {string} holds {int} entries', (path: string, expected: number) => actor().attemptsTo(Ensure.that(resolved(count(path)), equals(expected))));

Then('every response item {string} is {string}', async (path: string, expected: string) => {
	const items = (await actor().answer(field('items'))) as Record<string, unknown>[];
	const values = items.map((item) => path.split('.').reduce<unknown>((value, segment) => (value as Record<string, unknown>)[segment], item));
	await actor().attemptsTo(Ensure.that(values.map(String).join(','), equals(items.map(() => expected).join(','))));
});

Then('the response items are sorted by {string}', async (path: string) => {
	const items = (await actor().answer(field('items'))) as Record<string, string>[];
	const values = items.map((item) => item[path] ?? '');
	await actor().attemptsTo(Ensure.that(values.join(','), equals([...values].sort().join(','))));
});

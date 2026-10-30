import { type DataTable, Given, Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isGreaterThan, isTrue } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, PatchRequest, PostRequest, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

const actor = () => actorCalled('API client');
const justification = 'I need this course to prepare for upcoming secure development work.';

// Scenarios share one running host, so the id of the request each scenario creates is tracked here.
let currentId = '';
const path = (p: string) => p.replace('{id}', currentId);

type Json = Record<string, unknown>;
const body = <T = Json>() => Question.about('the response body', async (a) => (await a.answer(LastResponse.body<T>())) as T);
const field = (dotted: string) =>
	Question.about(`the response ${dotted}`, async (a) => {
		let value: unknown = await a.answer(body());
		for (const key of dotted.split('.')) value = (value as Json | undefined)?.[key];
		return JSON.stringify(value);
	});
const items = () =>
	Question.about('the response items', async (a) => {
		const b = await a.answer(body<Json[] | { items: Json[] }>());
		return Array.isArray(b) ? b : b.items;
	});

When('the client sends GET {string}', (p: string) => actor().attemptsTo(Send.a(GetRequest.to(path(p)))));

When('the client sends POST {string} with:', (p: string, doc: string) => actor().attemptsTo(Send.a(PostRequest.to(path(p)).with(JSON.parse(doc)))));

When('the client sends PATCH {string} with:', (p: string, doc: string) => actor().attemptsTo(Send.a(PatchRequest.to(path(p)).with(JSON.parse(doc)))));

Given('{string} has an enrollment request for {string}', async (learnerEmail: string, courseId: string) => {
	await actor().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with({ courseId, learnerEmail, justification })), Ensure.that(resolved(LastResponse.status()), equals(201)));
	currentId = (await actor().answer(body<{ id: string }>())).id;
});

Given('the request is moved to {string}', (status: string) =>
	actor().attemptsTo(Send.a(PatchRequest.to(path('/api/enrollment-requests/{id}/status')).with({ status, changedBy: 'reviewer@example.org', reason: 'Reviewed.' })), Ensure.that(resolved(LastResponse.status()), equals(200))),
);

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the response {string} is {string}', (dotted: string, json: string) => actor().attemptsTo(Ensure.that(resolved(field(dotted)), equals(json))));

Then('the error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(field('error.code')), equals(JSON.stringify(code)))));

Then('every item has {string} equal to {string}', (key: string, value: string) =>
	actor().attemptsTo(
		Ensure.that(resolved(Question.about('item count', async (a) => (await a.answer(items())).length)), isGreaterThan(0)),
		Ensure.that(resolved(Question.about(`every item ${key}`, async (a) => (await a.answer(items())).every((i) => String(i[key]).toLowerCase() === value.toLowerCase()))), isTrue()),
	),
);

Then('the items are sorted by {string}', (key: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`items sorted by ${key}`, async (a) => {
					const values = (await a.answer(items())).map((i) => String(i[key]));
					return values.every((v, n) => n === 0 || (values[n - 1] ?? '') <= v);
				}),
			),
			isTrue(),
		),
	),
);

Then('the status history is:', (table: DataTable) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(Question.about('status history', async (a) => (await a.answer(body<{ statusHistory: { fromStatus: unknown; toStatus: unknown }[] }>())).statusHistory.map((h) => [String(h.fromStatus), String(h.toStatus)]))),
			equals(table.rows()),
		),
	),
);

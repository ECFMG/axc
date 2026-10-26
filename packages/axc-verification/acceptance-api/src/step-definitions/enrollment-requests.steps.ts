import { Given, Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, PatchRequest, PostRequest, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface EnrollmentRequest {
	id: string;
	statusHistory: { toStatus: string }[];
	[field: string]: unknown;
}

const actor = () => actorCalled('API client');
const JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';
let currentRequestId = '';

const body = <T>() => Question.about('the response body', async (a) => (await a.answer(LastResponse.body<T>())) as T);
const item = (description: string, read: (b: EnrollmentRequest) => unknown) => Question.about(description, async (a) => read(await a.answer(body<EnrollmentRequest>())));
const list = <T>(description: string, read: (rows: Record<string, unknown>[]) => T) =>
	Question.about(description, async (a) => {
		const b = await a.answer(body<Record<string, unknown>[] | { items: Record<string, unknown>[] }>());
		return read(Array.isArray(b) ? b : b.items);
	});

const requestEnrollment = (learnerEmail: string, courseId: string) => actor().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with({ courseId, learnerEmail, justification: JUSTIFICATION })));
const changeStatus = (status: string, reason?: string) =>
	actor().attemptsTo(Send.a(PatchRequest.to(`/api/enrollment-requests/${currentRequestId}/status`).with({ status, changedBy: 'reviewer@example.org', ...(reason ? { reason } : {}) })));

When('the client sends GET {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));
When('{string} requests enrollment in {string}', requestEnrollment);
When('the client posts the enrollment request {}', (json: string) => actor().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with(JSON.parse(json)))));
When('the client retrieves that enrollment request', () => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${currentRequestId}`))));
When('the reviewer changes that request to {string} with reason {string}', changeStatus);

Given('{string} has a {string} enrollment request in {string}', async (learnerEmail: string, status: string, courseId: string) => {
	await requestEnrollment(learnerEmail, courseId);
	currentRequestId = (await actor().answer(body<EnrollmentRequest>())).id;
	if (status !== 'pending') await changeStatus(status, 'Prerequisite course not completed.');
	await actor().attemptsTo(Ensure.that(resolved(item('the status', (b) => b['status'])), equals(status)));
});

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));
Then('the error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(Question.about('the error code', async (a) => (await a.answer(body<{ error: { code: string } }>())).error.code)), equals(code))));
Then('the response field {string} is {string}', (field: string, value: string) => actor().attemptsTo(Ensure.that(resolved(item(field, (b) => b[field])), equals(value))));
Then('the request has {int} status history entries', (count: number) => actor().attemptsTo(Ensure.that(resolved(item('history length', (b) => b.statusHistory.length)), equals(count))));
Then('the status history goes {string}', (statuses: string) => actor().attemptsTo(Ensure.that(resolved(item('history', (b) => b.statusHistory.map((e) => e.toStatus).join(','))), equals(statuses))));
Then('the response list has {int} entries', (count: number) => actor().attemptsTo(Ensure.that(resolved(list('row count', (rows) => rows.length)), equals(count))));
Then(/^every (?:item|entry) has "([^"]+)" equal to "([^"]+)"$/, (field: string, value: string) => actor().attemptsTo(Ensure.that(resolved(list(`every ${field}`, (rows) => rows.every((r) => r[field] === value))), equals(true))));
Then('the response has {int} items of {int} in total', (count: number, total: number) =>
	actor().attemptsTo(
		Ensure.that(resolved(list('item count', (rows) => rows.length)), equals(count)),
		Ensure.that(resolved(Question.about('total', async (a) => (await a.answer(body<{ totalItems: number }>())).totalItems)), equals(total)),
	),
);
Then('the items are sorted by {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				list(`sorted by ${field}`, (rows) => {
					const values = rows.map((r) => String(r[field]));
					return values.length > 0 && values.every((v, i) => i === 0 || (values[i - 1] as string) <= v);
				}),
			),
			equals(true),
		),
	),
);

import { Before, Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, PatchRequest, PostRequest, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

const actor = () => actorCalled('API client');

const VALID_JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';

interface EnrollmentBody {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: string;
	statusHistory: {
		fromStatus: string | null;
		toStatus: string;
		changedAt: string;
		changedBy: string;
		reason: string | null;
	}[];
}

interface EnrollmentListBody {
	items: EnrollmentBody[];
}

interface ScenarioState {
	learnerEmail?: string;
	courseId?: string;
	requestId?: string;
	justification?: string;
}

const state: ScenarioState = {};
let emailSequence = 0;

Before(() => {
	delete state.learnerEmail;
	delete state.courseId;
	delete state.requestId;
	delete state.justification;
});

When('the client creates an enrollment request for {string} with a valid justification', async (courseId: string) => {
	await sendCreate(courseId, nextEmail(), VALID_JUSTIFICATION);
});

When('the client creates an enrollment request for {string} with email {string} and justification {string}', async (courseId: string, learnerEmail: string, justification: string) => {
	await sendCreate(courseId, learnerEmail, justification);
});

When('the client creates an enrollment request for {string} with a justification of {int} characters', async (courseId: string, length: number) => {
	await sendCreate(courseId, nextEmail(), 'x'.repeat(length));
});

When('the client creates another enrollment request for the same learner and {string}', async (courseId: string) => {
	await sendCreate(courseId, required(state.learnerEmail, 'learnerEmail'), state.justification ?? VALID_JUSTIFICATION);
});

When('the client reads the current enrollment request', () => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${required(state.requestId, 'requestId')}`))));

When('the client reads enrollment request {string}', (id: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${id}`))));

When('the client lists enrollment requests with status {string}', (status: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests?status=${encodeURIComponent(status)}`))));

When('the client lists enrollment requests for course {string}', (courseId: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests?courseId=${encodeURIComponent(courseId)}`))));

When('the client lists enrollment requests for the created learner', () => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests?learnerEmail=${encodeURIComponent(required(state.learnerEmail, 'learnerEmail'))}`))));

When('the client lists enrollment requests filtered by the created request', () => {
	const learnerEmail = encodeURIComponent(required(state.learnerEmail, 'learnerEmail'));
	const courseId = encodeURIComponent(required(state.courseId, 'courseId'));
	return actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests?status=pending&courseId=${courseId}&learnerEmail=${learnerEmail}`)));
});

When('the client approves the current enrollment request', () => patchStatus(required(state.requestId, 'requestId'), 'approved'));

When('the client sets the current enrollment request status to {string}', (status: string) => patchStatus(required(state.requestId, 'requestId'), status));

When('the client sets enrollment request {string} status to {string}', (id: string, status: string) => patchStatus(id, status));

When('the client rejects the current enrollment request with reason {string}', (reason: string) =>
	actor().attemptsTo(
		Send.a(
			PatchRequest.to(`/api/enrollment-requests/${required(state.requestId, 'requestId')}/status`).with({
				status: 'rejected',
				changedBy: 'reviewer@example.org',
				reason,
			}),
		),
	),
);

When('the client rejects the current enrollment request without a reason', () =>
	actor().attemptsTo(
		Send.a(
			PatchRequest.to(`/api/enrollment-requests/${required(state.requestId, 'requestId')}/status`).with({
				status: 'rejected',
				changedBy: 'reviewer@example.org',
			}),
		),
	),
);

Then('the enrollment request is pending for {string}', (courseId: string) => actor().attemptsTo(Ensure.that(resolved(requestField('status')), equals('pending')), Ensure.that(resolved(requestField('courseId')), equals(courseId))));

Then('the enrollment request status is {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(requestField('status')), equals(status))));

Then('the enrollment request history starts with a system pending entry', () => actor().attemptsTo(Ensure.that(resolved(initialHistory), equals(true))));

Then('the enrollment request includes the created justification and status history', () => {
	const justification = state.justification ?? '';
	return actor().attemptsTo(Ensure.that(resolved(requestField('justification')), equals(justification)), Ensure.that(resolved(historyLength), equals(1)));
});

Then('the enrollment request history has {int} entries', (count: number) => actor().attemptsTo(Ensure.that(resolved(historyLength), equals(count))));

Then('the last history entry changes {string} to {string}', (from: string, to: string) => actor().attemptsTo(Ensure.that(resolved(lastHistoryChanges(from, to)), equals(true))));

Then('every listed enrollment request has status {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(everyListed((item) => item.status === status)), equals(true))));

Then('every listed enrollment request has course {string}', (courseId: string) => actor().attemptsTo(Ensure.that(resolved(everyListed((item) => item.courseId === courseId)), equals(true))));

Then('every listed enrollment request belongs to the created learner', () => {
	const learnerEmail = required(state.learnerEmail, 'learnerEmail').toLowerCase();
	return actor().attemptsTo(Ensure.that(resolved(everyListed((item) => item.learnerEmail.toLowerCase() === learnerEmail)), equals(true)));
});

Then('the listed enrollment requests include the current request', () => {
	const requestId = required(state.requestId, 'requestId');
	return actor().attemptsTo(Ensure.that(resolved(listIncludes(requestId)), equals(true)));
});

async function sendCreate(courseId: string, learnerEmail: string, justification: string): Promise<void> {
	state.courseId = courseId;
	state.learnerEmail = learnerEmail;
	state.justification = justification;
	await actor().attemptsTo(
		Send.a(
			PostRequest.to('/api/enrollment-requests').with({
				courseId,
				learnerEmail,
				justification,
			}),
		),
	);
	const status = await actor().answer(LastResponse.status());
	if (status !== 201) {
		return;
	}
	const body = await actor().answer(LastResponse.body<EnrollmentBody>());
	state.requestId = body.id;
}

function patchStatus(id: string, status: string) {
	return actor().attemptsTo(
		Send.a(
			PatchRequest.to(`/api/enrollment-requests/${id}/status`).with({
				status,
				changedBy: 'reviewer@example.org',
			}),
		),
	);
}

function nextEmail(): string {
	emailSequence += 1;
	return `learner-${emailSequence}@example.org`;
}

function required(value: string | undefined, label: string): string {
	if (value === undefined || value.length === 0) {
		throw new Error(`${label} was not captured for this scenario`);
	}
	return value;
}

async function readRequest(current: { answer<T>(answerable: Answerable<T>): Promise<T> }): Promise<EnrollmentBody> {
	return await current.answer(LastResponse.body<EnrollmentBody>());
}

async function readList(current: { answer<T>(answerable: Answerable<T>): Promise<T> }): Promise<EnrollmentListBody> {
	return await current.answer(LastResponse.body<EnrollmentListBody>());
}

const requestField = (field: 'status' | 'courseId' | 'justification') =>
	Question.about(`the enrollment ${field}`, async (current) => {
		const body = await readRequest(current);
		return body[field];
	});

const historyLength = Question.about('the status history length', async (current) => {
	const body = await readRequest(current);
	return body.statusHistory.length;
});

const initialHistory = Question.about('the initial status history entry', async (current) => {
	const body = await readRequest(current);
	const entry = body.statusHistory[0];
	if (entry === undefined) {
		return false;
	}
	return entry.fromStatus === null && entry.toStatus === 'pending' && entry.changedBy === 'system' && entry.reason === null && /^\d{4}-\d{2}-\d{2}T/.test(entry.changedAt);
});

const lastHistoryChanges = (from: string, to: string) =>
	Question.about(`the last history entry changes ${from} to ${to}`, async (current) => {
		const body = await readRequest(current);
		const entry = body.statusHistory[body.statusHistory.length - 1];
		if (entry === undefined) {
			return false;
		}
		return entry.fromStatus === from && entry.toStatus === to;
	});

const everyListed = (predicate: (item: EnrollmentBody) => boolean) =>
	Question.about('every listed enrollment request', async (current) => {
		const body = await readList(current);
		return body.items.length > 0 && body.items.every(predicate);
	});

const listIncludes = (requestId: string) =>
	Question.about(`the list includes ${requestId}`, async (current) => {
		const body = await readList(current);
		return body.items.some((item) => item.id === requestId);
	});

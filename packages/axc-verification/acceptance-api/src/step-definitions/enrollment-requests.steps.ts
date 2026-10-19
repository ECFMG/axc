import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, PatchRequest, PostRequest, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface StatusHistoryEntry {
	fromStatus: string | null;
	toStatus: string;
	changedAt: string;
	changedBy: string;
	reason: string | null;
}

interface EnrollmentRequestBody {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: string;
	createdAt: string;
	updatedAt: string;
	statusHistory: StatusHistoryEntry[];
}

interface EnrollmentRequestListBody {
	items: EnrollmentRequestBody[];
}

interface EnrollmentErrorBody {
	error: {
		code: string;
		message: string;
		details: Array<{ field: string; message: string }>;
	};
}

const actor = () => actorCalled('API client');
let createdRequestId = '';

const enrollmentRequest = Question.about('the enrollment request', (currentActor) => currentActor.answer(LastResponse.body<EnrollmentRequestBody>()));
const enrollmentList = Question.about('the enrollment request list', (currentActor) => currentActor.answer(LastResponse.body<EnrollmentRequestListBody>()));

When('the client creates an enrollment request for course {string} as {string} because {string}', async (courseId: string, learnerEmail: string, justification: string) => {
	await actor().attemptsTo(
		Send.a(
			PostRequest.to('/api/enrollment-requests').with({
				courseId,
				learnerEmail,
				justification,
			}),
		),
	);
	await rememberCreatedRequest();
});

When('the client submits this enrollment request:', async (body: string) => {
	await actor().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with(JSON.parse(body) as Record<string, unknown>)));
});

When('the client submits malformed enrollment request JSON', async () => {
	await actor().attemptsTo(
		Send.a(
			PostRequest.to('/api/enrollment-requests')
				.with('{')
				.using({
					headers: { 'Content-Type': 'application/json' },
				}),
		),
	);
});

When('the client retrieves the created enrollment request', async () => {
	await actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${createdRequestId}`)));
});

When('the client requests enrollment request {string}', async (id: string) => {
	await actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${id}`)));
});

When('the client lists enrollment requests with query {string}', async (query: string) => {
	await actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests?${query}`)));
});

When('the client sets the created enrollment request status to {string} by {string}', async (status: string, changedBy: string) => {
	await actor().attemptsTo(Send.a(PatchRequest.to(`/api/enrollment-requests/${createdRequestId}/status`).with({ status, changedBy })));
});

When('the client sets the created enrollment request status to {string} by {string} because {string}', async (status: string, changedBy: string, reason: string) => {
	await actor().attemptsTo(Send.a(PatchRequest.to(`/api/enrollment-requests/${createdRequestId}/status`).with({ status, changedBy, reason })));
});

Then('the enrollment request responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the enrollment request status is {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(requestField('status')), equals(status))));

Then('the enrollment request course is {string}', (courseId: string) => actor().attemptsTo(Ensure.that(resolved(requestField('courseId')), equals(courseId))));

Then('the enrollment request learner is {string}', (learnerEmail: string) => actor().attemptsTo(Ensure.that(resolved(requestField('learnerEmail')), equals(learnerEmail))));

Then('the enrollment request history has {int} entries', (count: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the history length', async (currentActor) => {
					const body = await currentActor.answer(enrollmentRequest);
					return body.statusHistory.length;
				}),
			),
			equals(count),
		),
	),
);

Then('enrollment history entry {int} goes from {string} to {string} by {string}', (entryNumber: number, fromStatus: string, toStatus: string, changedBy: string) =>
	actor().attemptsTo(Ensure.that(resolved(historyMatches(entryNumber, fromStatus, toStatus, changedBy)), equals(true))),
);

Then('enrollment history entry {int} goes from {string} to {string} by {string} because {string}', (entryNumber: number, fromStatus: string, toStatus: string, changedBy: string, reason: string) =>
	actor().attemptsTo(Ensure.that(resolved(historyMatches(entryNumber, fromStatus, toStatus, changedBy, reason)), equals(true))),
);

Then('the enrollment request error code is {string}', (code: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the enrollment error code', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<EnrollmentErrorBody>());
					return body.error.code;
				}),
			),
			equals(code),
		),
	),
);

Then('the enrollment request error message is {string}', (message: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the enrollment error message', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<EnrollmentErrorBody>());
					return body.error.message;
				}),
			),
			equals(message),
		),
	),
);

Then('the enrollment request error details include field {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`enrollment error details include ${field}`, async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<EnrollmentErrorBody>());
					return body.error.details.some((detail) => detail.field === field);
				}),
			),
			equals(true),
		),
	),
);

Then('the enrollment request error details include field {string} and message {string}', (field: string, message: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`enrollment error details include ${field}`, async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<EnrollmentErrorBody>());
					return body.error.details.some((detail) => detail.field === field && detail.message === message);
				}),
			),
			equals(true),
		),
	),
);

Then('the enrollment request list contains {int} requests', (count: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the listed enrollment request count', async (currentActor) => {
					const body = await currentActor.answer(enrollmentList);
					return body.items.length;
				}),
			),
			equals(count),
		),
	),
);

Then('every listed enrollment request has status {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(everyListed((request) => request.status === status)), equals(true))));

Then('every listed enrollment request has course {string}', (courseId: string) => actor().attemptsTo(Ensure.that(resolved(everyListed((request) => request.courseId === courseId)), equals(true))));

Then('every listed enrollment request has learner {string}', (learnerEmail: string) => actor().attemptsTo(Ensure.that(resolved(everyListed((request) => request.learnerEmail === learnerEmail)), equals(true))));

async function rememberCreatedRequest(): Promise<void> {
	const status = await actor().answer(LastResponse.status());
	if (status !== 201) {
		return;
	}
	const body = await actor().answer(LastResponse.body<EnrollmentRequestBody>());
	createdRequestId = body.id;
}

function requestField<K extends keyof EnrollmentRequestBody>(field: K) {
	return Question.about(`the enrollment request ${field}`, async (currentActor) => {
		const body = await currentActor.answer(enrollmentRequest);
		return body[field];
	});
}

function historyMatches(entryNumber: number, fromStatus: string, toStatus: string, changedBy: string, reason?: string) {
	return Question.about(`history entry ${entryNumber}`, async (currentActor) => {
		const body = await currentActor.answer(enrollmentRequest);
		const entry = body.statusHistory[entryNumber - 1];
		if (entry === undefined) {
			return false;
		}
		const expectedFrom = fromStatus.length === 0 ? null : fromStatus;
		const reasonMatches = reason === undefined || entry.reason === reason;
		return entry.fromStatus === expectedFrom && entry.toStatus === toStatus && entry.changedBy === changedBy && reasonMatches;
	});
}

function everyListed(predicate: (request: EnrollmentRequestBody) => boolean) {
	return Question.about('every listed enrollment request matches', async (currentActor) => {
		const body = await currentActor.answer(enrollmentList);
		return body.items.length > 0 && body.items.every(predicate);
	});
}

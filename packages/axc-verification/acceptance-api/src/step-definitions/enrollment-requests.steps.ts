import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, PatchRequest, PostRequest, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface EnrollmentRequest {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: string;
	createdAt: string;
	updatedAt: string;
	statusHistory: Array<{
		fromStatus: string | null;
		toStatus: string;
		changedAt: string;
		changedBy: string;
		reason: string | null;
	}>;
}

interface EnrollmentRequestListResponse {
	items: EnrollmentRequest[];
}

interface EnrollmentErrorResponse {
	error: {
		code: string;
		message: string;
		details: Array<{ field: string; message: string }>;
	};
}

const VALID_JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';
const actor = () => actorCalled('API client');
let lastEnrollmentRequestId: string | undefined;

const requestBody = () =>
	Question.about('the enrollment request body', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<EnrollmentRequest>());
	});

const listBody = () =>
	Question.about('the enrollment request list body', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<EnrollmentRequestListResponse>());
	});

const errorBody = () =>
	Question.about('the enrollment request error body', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<EnrollmentErrorResponse>());
	});

When('the client creates an enrollment request for course {string} as {string}', async (courseId: string, learnerEmail: string) => {
	await actor().attemptsTo(
		Send.a(
			PostRequest.to('/api/enrollment-requests').with({
				courseId,
				learnerEmail,
				justification: VALID_JUSTIFICATION,
			}),
		),
	);
	const status = await actor().answer(LastResponse.status());
	if (status === 201) {
		const body = await actor().answer(LastResponse.body<EnrollmentRequest>());
		lastEnrollmentRequestId = body.id;
	}
});

When('the client creates an enrollment request with email {string} and justification {string}', (learnerEmail: string, justification: string) =>
	actor().attemptsTo(
		Send.a(
			PostRequest.to('/api/enrollment-requests').with({
				courseId: 'course-001',
				learnerEmail,
				justification,
			}),
		),
	),
);

When('the client requests the last enrollment request by id', () => {
	if (lastEnrollmentRequestId === undefined) {
		throw new Error('No enrollment request id is available');
	}
	return actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${lastEnrollmentRequestId}`)));
});

When('the client lists enrollment requests with query {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests?${query}`))));

When('the client updates the last enrollment request status to {string} as {string}', (status: string, changedBy: string) => {
	if (lastEnrollmentRequestId === undefined) {
		throw new Error('No enrollment request id is available');
	}
	return actor().attemptsTo(
		Send.a(
			PatchRequest.to(`/api/enrollment-requests/${lastEnrollmentRequestId}/status`).with({
				status,
				changedBy,
			}),
		),
	);
});

When('the client rejects the last enrollment request as {string} with reason {string}', (changedBy: string, reason: string) => {
	if (lastEnrollmentRequestId === undefined) {
		throw new Error('No enrollment request id is available');
	}
	return actor().attemptsTo(
		Send.a(
			PatchRequest.to(`/api/enrollment-requests/${lastEnrollmentRequestId}/status`).with({
				status: 'rejected',
				changedBy,
				reason,
			}),
		),
	);
});

Then('the enrollment request responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the enrollment request status is {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('enrollment status', async (currentActor) => {
					const body = await currentActor.answer(requestBody());
					return body.status;
				}),
			),
			equals(status),
		),
	),
);

Then('the enrollment request history has {int} entry', (count: number) => assertHistoryLength(count));

Then('the enrollment request history has {int} entries', (count: number) => assertHistoryLength(count));

Then('the enrollment request list contains {int} item', (count: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('enrollment list length', async (currentActor) => {
					const body = await currentActor.answer(listBody());
					return body.items.length;
				}),
			),
			equals(count),
		),
	),
);

Then('the enrollment request error code is {string}', (code: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('enrollment error code', async (currentActor) => {
					const body = await currentActor.answer(errorBody());
					return body.error.code;
				}),
			),
			equals(code),
		),
	),
);

function assertHistoryLength(count: number) {
	return actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('enrollment history length', async (currentActor) => {
					const body = await currentActor.answer(requestBody());
					return body.statusHistory.length;
				}),
			),
			equals(count),
		),
	);
}

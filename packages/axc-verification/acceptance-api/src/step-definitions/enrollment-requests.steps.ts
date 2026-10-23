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

interface EnrollmentRequestListResponse {
	items: EnrollmentRequestBody[];
}

const VALID_JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';

const actor = () => actorCalled('API client');

let lastEnrollmentRequestId = '';

When('the client creates an enrollment request for course {string} as {string} with a valid justification', async (courseId: string, learnerEmail: string) => {
	await createEnrollmentRequest(courseId, learnerEmail, VALID_JUSTIFICATION);
});

When('the client creates an enrollment request for course {string} as {string} with justification {string}', async (courseId: string, learnerEmail: string, justification: string) => {
	await createEnrollmentRequest(courseId, learnerEmail, justification);
});

When('the client retrieves the last enrollment request by id', () => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${lastEnrollmentRequestId}`))));

When('the client patches the last enrollment request status to {string} as {string}', (status: string, changedBy: string) =>
	actor().attemptsTo(
		Send.a(
			PatchRequest.to(`/api/enrollment-requests/${lastEnrollmentRequestId}/status`).with({
				status,
				changedBy,
			}),
		),
	),
);

When('the client patches the last enrollment request status to {string} as {string} with reason {string}', (status: string, changedBy: string, reason: string) =>
	actor().attemptsTo(
		Send.a(
			PatchRequest.to(`/api/enrollment-requests/${lastEnrollmentRequestId}/status`).with({
				status,
				changedBy,
				reason,
			}),
		),
	),
);

Then('the enrollment request status is {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('enrollment request status', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<EnrollmentRequestBody>());
					rememberId(body);
					return body.status;
				}),
			),
			equals(status),
		),
	),
);

Then('the enrollment request has a creation history entry', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('creation history', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<EnrollmentRequestBody>());
					rememberId(body);
					const first = body.statusHistory[0];
					return first !== undefined && first.fromStatus === null && first.toStatus === 'pending' && first.changedBy === 'system' && first.reason === null && typeof first.changedAt === 'string';
				}),
			),
			equals(true),
		),
	),
);

Then('the enrollment request history includes a change from {string} to {string}', (fromStatus: string, toStatus: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('status history change', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<EnrollmentRequestBody>());
					rememberId(body);
					return body.statusHistory.some((entry: StatusHistoryEntry) => entry.fromStatus === fromStatus && entry.toStatus === toStatus);
				}),
			),
			equals(true),
		),
	),
);

Then('every enrollment request has status {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('list status', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<EnrollmentRequestListResponse>());
					return body.items.length > 0 && body.items.every((item: EnrollmentRequestBody) => item.status === status);
				}),
			),
			equals(true),
		),
	),
);

Then('every enrollment request has course id {string}', (courseId: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('list courseId', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<EnrollmentRequestListResponse>());
					return body.items.length > 0 && body.items.every((item: EnrollmentRequestBody) => item.courseId === courseId);
				}),
			),
			equals(true),
		),
	),
);

Then('every enrollment request has learner email {string}', (learnerEmail: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('list learnerEmail', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<EnrollmentRequestListResponse>());
					return body.items.length > 0 && body.items.every((item: EnrollmentRequestBody) => item.learnerEmail === learnerEmail);
				}),
			),
			equals(true),
		),
	),
);

async function createEnrollmentRequest(courseId: string, learnerEmail: string, justification: string): Promise<void> {
	await actor().attemptsTo(
		Send.a(
			PostRequest.to('/api/enrollment-requests').with({
				courseId,
				learnerEmail,
				justification,
			}),
		),
	);
	const body = await actor().answer(LastResponse.body<EnrollmentRequestBody>());
	rememberId(body);
}

function rememberId(body: EnrollmentRequestBody): void {
	if (typeof body.id === 'string' && body.id.length > 0) {
		lastEnrollmentRequestId = body.id;
	}
}

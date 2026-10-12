import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, notes, Question } from '@serenity-js/core';
import { GetRequest, PatchRequest, PostRequest, Send } from '@serenity-js/rest';
import { apiClient, bodyQuestion, DEFAULT_JUSTIFICATION, REVIEWER } from '../api-questions.ts';

interface EnrollmentNotes {
	enrollmentRequestId: string;
}

interface EnrollmentRequestBody {
	id?: string;
	status?: string;
	statusHistory?: { fromStatus: string | null; toStatus: string }[];
}

interface EnrollmentRequestListBody {
	items?: EnrollmentRequestBody[];
	totalItems?: number;
}

const recordedId = (): Answerable<string> => notes<EnrollmentNotes>().get('enrollmentRequestId') as unknown as Answerable<string>;

const recordedUrl = (suffix: string): Answerable<string> => Question.about(`the recorded enrollment request url${suffix}`, async (actor) => `/api/enrollment-requests/${await actor.answer(recordedId())}${suffix}`);

const rememberCreatedId = () =>
	notes<EnrollmentNotes>().set(
		'enrollmentRequestId',
		bodyQuestion<EnrollmentRequestBody, string>('the created enrollment request id', (body) => body.id ?? 'unknown'),
	);

const requestStatus = () => bodyQuestion<EnrollmentRequestBody, string>('the enrollment request status', (body) => body.status ?? '');

const auditTrailLength = () => bodyQuestion<EnrollmentRequestBody, number>('the enrollment request audit trail length', (body) => (body.statusHistory ?? []).length);

const listedCount = () => bodyQuestion<EnrollmentRequestListBody, number>('the number of listed enrollment requests', (body) => (body.items ?? []).length);

When('learner {string} requests enrollment in course {string}', (learnerEmail: string, courseId: string) =>
	apiClient().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with({ courseId, learnerEmail, justification: DEFAULT_JUSTIFICATION })), rememberCreatedId()),
);

When('learner {string} requests enrollment in course {string} with justification {string}', (learnerEmail: string, courseId: string, justification: string) =>
	apiClient().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with({ courseId, learnerEmail, justification })), rememberCreatedId()),
);

When('the client retrieves the recorded enrollment request', () => apiClient().attemptsTo(Send.a(GetRequest.to(recordedUrl('')))));

When('the reviewer sets the recorded enrollment request status to {string}', (status: string) => apiClient().attemptsTo(Send.a(PatchRequest.to(recordedUrl('/status')).with({ status, changedBy: REVIEWER }))));

When('the reviewer sets the recorded enrollment request status to {string} with reason {string}', (status: string, reason: string) =>
	apiClient().attemptsTo(Send.a(PatchRequest.to(recordedUrl('/status')).with({ status, changedBy: REVIEWER, reason }))),
);

When('the client lists enrollment requests with {string}', (query: string) => apiClient().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests?${query}`))));

Then('the enrollment request status is {string}', (status: string) => apiClient().attemptsTo(Ensure.that(requestStatus(), equals(status))));

Then('the enrollment request audit trail has {int} entry/entries', (expected: number) => apiClient().attemptsTo(Ensure.that(auditTrailLength(), equals(expected))));

Then('the enrollment request list contains {int} request/requests', (expected: number) => apiClient().attemptsTo(Ensure.that(listedCount(), equals(expected))));

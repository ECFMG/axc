import { type DataTable, Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isGreaterThan, isTrue } from '@serenity-js/assertions';
import { type Answerable, actorCalled, notes, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, PatchRequest, PostRequest, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

const asked = <T>(description: string, question: (currentActor: { answer<A>(value: Answerable<A>): Promise<A> }) => Promise<T>): Answerable<T> => resolved(Question.about(description, question));

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

interface EnrollmentRequestErrorDetail {
	field: string;
	message: string;
}

interface EnrollmentRequestErrorBody {
	error: {
		code: string;
		message: string;
		details: EnrollmentRequestErrorDetail[];
	};
}

interface EnrollmentNotes {
	lastEnrollmentRequestId: string;
}

const actor = () => actorCalled('API client');

const jsonHeaders = {
	headers: {
		'Content-Type': 'application/json',
	},
};

const enrollmentRequest = () =>
	Question.about('the enrollment request', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<EnrollmentRequestBody>());
	});

const enrollmentRequestList = () =>
	Question.about('the enrollment request list', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<EnrollmentRequestListBody>());
	});

const enrollmentError = () =>
	Question.about('the enrollment request error', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<EnrollmentRequestErrorBody>());
	});

function tableRecord(table: DataTable): Record<string, string> {
	return Object.fromEntries(table.raw().map(([field, value]) => [field ?? '', value ?? '']));
}

function listPath(params?: Record<string, string>): string {
	if (!params || Object.keys(params).length === 0) {
		return '/api/enrollment-requests';
	}
	const search = new URLSearchParams(params);
	return `/api/enrollment-requests?${search.toString()}`;
}

When('the client creates an enrollment request with:', (table: DataTable) => {
	const body = tableRecord(table);
	return actor().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with(body).using(jsonHeaders)));
});

When('the client retrieves the last enrollment request by id', async () => {
	const currentActor = actor();
	const body = await currentActor.answer(LastResponse.body<EnrollmentRequestBody>());
	await currentActor.attemptsTo(notes<EnrollmentNotes>().set('lastEnrollmentRequestId', body.id), Send.a(GetRequest.to(`/api/enrollment-requests/${body.id}`)));
});

When('the client retrieves enrollment request {string}', (id: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${id}`))));

When('the client lists enrollment requests with:', (table: DataTable) => actor().attemptsTo(Send.a(GetRequest.to(listPath(tableRecord(table))))));

When('the client updates the last enrollment request status with:', async (table: DataTable) => {
	const body = tableRecord(table);
	const currentActor = actor();
	const current = await currentActor.answer(LastResponse.body<EnrollmentRequestBody>());
	const id = typeof current.id === 'string' && current.id.length > 0 ? current.id : await currentActor.answer(notes<EnrollmentNotes>().get('lastEnrollmentRequestId'));
	await currentActor.attemptsTo(notes<EnrollmentNotes>().set('lastEnrollmentRequestId', id), Send.a(PatchRequest.to(`/api/enrollment-requests/${id}/status`).with(body).using(jsonHeaders)));
});

When('the client approves the last enrollment request as {string}', async (changedBy: string) => {
	const currentActor = actor();
	const current = await currentActor.answer(LastResponse.body<EnrollmentRequestBody>());
	await currentActor.attemptsTo(
		notes<EnrollmentNotes>().set('lastEnrollmentRequestId', current.id),
		Send.a(PatchRequest.to(`/api/enrollment-requests/${current.id}/status`).with({ status: 'approved', changedBy }).using(jsonHeaders)),
	);
});

Then('the enrollment request responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the enrollment request is pending for course {string} and learner {string}', (courseId: string, learnerEmail: string) =>
	actor().attemptsTo(
		Ensure.that(
			asked('request id', async (currentActor) => (await currentActor.answer(enrollmentRequest())).id.length),
			isGreaterThan(0),
		),
		Ensure.that(
			asked('request status', async (currentActor) => (await currentActor.answer(enrollmentRequest())).status),
			equals('pending'),
		),
		Ensure.that(
			asked('request course', async (currentActor) => (await currentActor.answer(enrollmentRequest())).courseId),
			equals(courseId),
		),
		Ensure.that(
			asked('request learner', async (currentActor) => (await currentActor.answer(enrollmentRequest())).learnerEmail),
			equals(learnerEmail),
		),
		Ensure.that(
			asked('request timestamps', async (currentActor) => {
				const body = await currentActor.answer(enrollmentRequest());
				return body.createdAt.includes('T') && body.updatedAt.includes('T');
			}),
			isTrue(),
		),
	),
);

Then('the enrollment request has status {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(
			asked('request status', async (currentActor) => (await currentActor.answer(enrollmentRequest())).status),
			equals(status),
		),
	),
);

Then('the enrollment request status history starts with a pending creation entry', () =>
	actor().attemptsTo(
		Ensure.that(
			asked('creation history entry', async (currentActor) => {
				const history = (await currentActor.answer(enrollmentRequest())).statusHistory;
				const first = history[0];
				return history.length >= 1 && first?.fromStatus === null && first.toStatus === 'pending' && first.changedBy === 'system' && first.changedAt.includes('T') && first.reason === null;
			}),
			isTrue(),
		),
	),
);

Then('the enrollment request status history records a change to {string} by {string}', (toStatus: string, changedBy: string) =>
	actor().attemptsTo(
		Ensure.that(
			asked(`history change to ${toStatus}`, async (currentActor) => {
				const history = (await currentActor.answer(enrollmentRequest())).statusHistory;
				const last = history[history.length - 1];
				return history.length >= 2 && last?.toStatus === toStatus && last.changedBy === changedBy && last.changedAt.includes('T');
			}),
			isTrue(),
		),
	),
);

Then('the enrollment request status history records a change to {string} by {string} with reason {string}', (toStatus: string, changedBy: string, reason: string) =>
	actor().attemptsTo(
		Ensure.that(
			asked(`history change to ${toStatus} with reason`, async (currentActor) => {
				const history = (await currentActor.answer(enrollmentRequest())).statusHistory;
				const last = history[history.length - 1];
				return history.length >= 2 && last?.toStatus === toStatus && last.changedBy === changedBy && last.reason === reason;
			}),
			isTrue(),
		),
	),
);

Then('every listed enrollment request has status {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(
			asked(`listed requests have status ${status}`, async (currentActor) => {
				const items = (await currentActor.answer(enrollmentRequestList())).items;
				return items.length > 0 && items.every((request) => request.status === status);
			}),
			isTrue(),
		),
	),
);

Then('every listed enrollment request has course {string}', (courseId: string) =>
	actor().attemptsTo(
		Ensure.that(
			asked(`listed requests have course ${courseId}`, async (currentActor) => {
				const items = (await currentActor.answer(enrollmentRequestList())).items;
				return items.length > 0 && items.every((request) => request.courseId === courseId);
			}),
			isTrue(),
		),
	),
);

Then('every listed enrollment request has learner {string}', (learnerEmail: string) =>
	actor().attemptsTo(
		Ensure.that(
			asked(`listed requests have learner ${learnerEmail}`, async (currentActor) => {
				const items = (await currentActor.answer(enrollmentRequestList())).items;
				return items.length > 0 && items.every((request) => request.learnerEmail === learnerEmail);
			}),
			isTrue(),
		),
	),
);

Then('the enrollment request error code is {string}', (code: string) =>
	actor().attemptsTo(
		Ensure.that(
			asked('error code', async (currentActor) => (await currentActor.answer(enrollmentError())).error.code),
			equals(code),
		),
	),
);

Then('the enrollment request error is INVALID_REQUEST for {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			asked('error code', async (currentActor) => (await currentActor.answer(enrollmentError())).error.code),
			equals('INVALID_REQUEST'),
		),
		Ensure.that(
			asked(`error details include ${field}`, async (currentActor) => {
				const details = (await currentActor.answer(enrollmentError())).error.details;
				return Array.isArray(details) && details.some((detail) => detail.field === field && typeof detail.message === 'string' && detail.message.length > 0);
			}),
			isTrue(),
		),
	),
);

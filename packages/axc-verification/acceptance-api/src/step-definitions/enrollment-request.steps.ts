import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, notes, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, PatchRequest, PostRequest, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

const standardJustification = 'I need this course to prepare for upcoming secure development work.';

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

interface EnrollmentListBody {
	items: EnrollmentRequestBody[];
}

interface EnrollmentErrorBody {
	error: {
		code: string;
		message: string;
		details: { field: string; message: string }[];
	};
}

const actor = () => actorCalled('API client');

const requestBody = () =>
	Question.about('the enrollment request', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<EnrollmentRequestBody>());
	});

const listBody = () =>
	Question.about('the enrollment list', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<EnrollmentListBody>());
	});

const errorBody = () =>
	Question.about('the enrollment error', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<EnrollmentErrorBody>());
	});

const createdId = () =>
	Question.about('created enrollment request id', async (currentActor) => {
		return (await currentActor.answer(LastResponse.body<EnrollmentRequestBody>())).id;
	});

const storedPath = (suffix: string) =>
	Question.about('stored enrollment request path', async (currentActor) => {
		const id = await currentActor.answer(notes().get('requestId'));
		return `/api/enrollment-requests/${String(id)}${suffix}`;
	});

When('the client creates an enrollment request for course {string} as {string}', (courseId: string, learnerEmail: string) =>
	actor().attemptsTo(
		Send.a(
			PostRequest.to('/api/enrollment-requests').with({
				courseId,
				learnerEmail,
				justification: standardJustification,
			}),
		),
	),
);

When('the client creates an enrollment request with email {string} and justification {string} for course {string}', (learnerEmail: string, justification: string, courseId: string) =>
	actor().attemptsTo(
		Send.a(
			PostRequest.to('/api/enrollment-requests').with({
				courseId,
				learnerEmail,
				justification,
			}),
		),
	),
);

When('the client creates an enrollment request with justification length {int} for course {string} as {string}', (length: number, courseId: string, learnerEmail: string) =>
	actor().attemptsTo(
		Send.a(
			PostRequest.to('/api/enrollment-requests').with({
				courseId,
				learnerEmail,
				justification: 'x'.repeat(length),
			}),
		),
	),
);

When('the client reads enrollment request {string}', (id: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${id}`))));

When('the client reads the stored enrollment request', () => actor().attemptsTo(Send.a(GetRequest.to(storedPath('')))));

When('the client lists enrollment requests with query {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests${query}`))));

When('the client sets the stored enrollment request status to {string} by {string}', (status: string, changedBy: string) => actor().attemptsTo(Send.a(PatchRequest.to(storedPath('/status')).with({ status, changedBy }))));

When('the client sets the stored enrollment request status to {string} by {string} because {string}', (status: string, changedBy: string, reason: string) =>
	actor().attemptsTo(Send.a(PatchRequest.to(storedPath('/status')).with({ status, changedBy, reason }))),
);

When('the client sets the stored enrollment request status to {string} by {string} with an empty reason', (status: string, changedBy: string) =>
	actor().attemptsTo(Send.a(PatchRequest.to(storedPath('/status')).with({ status, changedBy, reason: '' }))),
);

Then('the enrollment response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the created enrollment request id is remembered', () => actor().attemptsTo(notes().set('requestId', createdId())));

Then('the enrollment request status is {string}', (status: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('request status', async (currentActor) => (await currentActor.answer(requestBody())).status)), equals(status))),
);

Then('the enrollment learner email is {string}', (learnerEmail: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('learner email', async (currentActor) => (await currentActor.answer(requestBody())).learnerEmail)), equals(learnerEmail))),
);

Then('the enrollment course is {string}', (courseId: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('course id', async (currentActor) => (await currentActor.answer(requestBody())).courseId)), equals(courseId))),
);

Then('the enrollment status history has {int} entries', (count: number) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('history length', async (currentActor) => (await currentActor.answer(requestBody())).statusHistory.length)), equals(count))),
);

Then('the enrollment history entry {int} goes from {string} to {string} by {string}', (position: number, fromStatus: string, toStatus: string, changedBy: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('history from status', async (currentActor) => {
					const entry = (await currentActor.answer(requestBody())).statusHistory[position - 1];
					const actual = entry?.fromStatus === null ? 'null' : (entry?.fromStatus ?? '');
					return actual;
				}),
			),
			equals(fromStatus),
		),
		Ensure.that(resolved(Question.about('history to status', async (currentActor) => (await currentActor.answer(requestBody())).statusHistory[position - 1]?.toStatus ?? '')), equals(toStatus)),
		Ensure.that(resolved(Question.about('history changed by', async (currentActor) => (await currentActor.answer(requestBody())).statusHistory[position - 1]?.changedBy ?? '')), equals(changedBy)),
	),
);

Then('the enrollment history entry {int} has no reason', (position: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('history reason', async (currentActor) => {
					const reason = (await currentActor.answer(requestBody())).statusHistory[position - 1]?.reason;
					return reason === null ? 'null' : (reason ?? '');
				}),
			),
			equals('null'),
		),
	),
);

Then('the enrollment history entry {int} reason is {string}', (position: number, reason: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('history reason text', async (currentActor) => (await currentActor.answer(requestBody())).statusHistory[position - 1]?.reason ?? '')), equals(reason))),
);

Then('the enrollment list count is {int}', (count: number) => actor().attemptsTo(Ensure.that(resolved(Question.about('list count', async (currentActor) => (await currentActor.answer(listBody())).items.length)), equals(count))));

Then('every listed enrollment status is {string}', (status: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('listed statuses', async (currentActor) => (await currentActor.answer(listBody())).items.every((item) => item.status === status))), equals(true))),
);

Then('every listed enrollment course is {string}', (courseId: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('listed courses', async (currentActor) => (await currentActor.answer(listBody())).items.every((item) => item.courseId === courseId))), equals(true))),
);

Then('every listed enrollment email is {string}', (learnerEmail: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('listed emails', async (currentActor) => (await currentActor.answer(listBody())).items.every((item) => item.learnerEmail === learnerEmail))), equals(true))),
);

Then('the enrollment error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(Question.about('error code', async (currentActor) => (await currentActor.answer(errorBody())).error.code)), equals(code))));

Then('the enrollment error details include field {string}', (field: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about(`error field ${field}`, async (currentActor) => (await currentActor.answer(errorBody())).error.details.some((detail) => detail.field === field))), equals(true))),
);

Then('the enrollment error message for {string} is {string}', (field: string, message: string) =>
	actor().attemptsTo(
		Ensure.that(resolved(Question.about(`error message ${field}`, async (currentActor) => (await currentActor.answer(errorBody())).error.details.find((detail) => detail.field === field)?.message ?? '')), equals(message)),
	),
);

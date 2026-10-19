import { randomUUID } from 'node:crypto';
import { type DataTable, Given, Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { type Answerable, actorCalled, notes, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, PatchRequest, PostRequest, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
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

interface EnrollmentListBody {
	items: EnrollmentRequestBody[];
	totalItems: number;
}

interface EnrollmentErrorBody {
	error: {
		code: string;
		message: string;
		details: { field: string; message: string }[];
	};
}

interface EnrollmentNotes {
	learnerEmail: string;
	requestId: string;
}

const ENROLLMENT_REQUESTS = '/api/enrollment-requests';
const REVIEWER = 'reviewer@example.org';
const VALID_JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';

const actor = () => actorCalled('API client');

const learnerEmail = (): Promise<string> => actor().answer(resolved(notes<EnrollmentNotes>().get('learnerEmail')));
const requestId = (): Promise<string> => actor().answer(resolved(notes<EnrollmentNotes>().get('requestId')));

const enrollmentRequest = () =>
	Question.about('the enrollment request', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<EnrollmentRequestBody>());
	});

const enrollmentList = () =>
	Question.about('the enrollment request list', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<EnrollmentListBody>());
	});

const enrollmentError = () =>
	Question.about('the enrollment API error', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<EnrollmentErrorBody>());
	});

const createRequest = (courseId: string, email: string, justification: string = VALID_JUSTIFICATION): Promise<void> =>
	actor().attemptsTo(Send.a(PostRequest.to(ENROLLMENT_REQUESTS).with({ courseId, learnerEmail: email, justification })));

const changeStatus = (id: string, status: string, reason: string): Promise<void> => {
	const body: { status: string; changedBy: string; reason?: string } = reason === '' ? { status, changedBy: REVIEWER } : { status, changedBy: REVIEWER, reason };
	return actor().attemptsTo(Send.a(PatchRequest.to(`${ENROLLMENT_REQUESTS}/${encodeURIComponent(id)}/status`).with(body)));
};

const expectStatus = (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status)));

/** Status changes that bring a freshly created pending request to the given status. */
const pathTo: Record<string, { status: string; reason: string }[]> = {
	pending: [],
	approved: [{ status: 'approved', reason: '' }],
	rejected: [{ status: 'rejected', reason: 'Learner has not completed the prerequisite course.' }],
	cancelled: [{ status: 'cancelled', reason: '' }],
};

const listFor = (query: string): Promise<void> => actor().attemptsTo(Send.a(GetRequest.to(`${ENROLLMENT_REQUESTS}?${query}`)));

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given('a new learner', () => actor().attemptsTo(notes<EnrollmentNotes>().set('learnerEmail', `learner-${randomUUID()}@example.org`)));

Given('the learner has a {string} enrollment request for course {string}', async (status: string, courseId: string) => {
	const steps = pathTo[status];
	if (steps === undefined) {
		throw new Error(`Unsupported enrollment status in step: ${status}`);
	}
	await createRequest(courseId, await learnerEmail());
	await expectStatus(201);
	const created = await actor().answer(resolved(enrollmentRequest()));
	await actor().attemptsTo(notes<EnrollmentNotes>().set('requestId', created.id));
	for (const step of steps) {
		await changeStatus(created.id, step.status, step.reason);
		await expectStatus(200);
	}
});

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When('the learner requests enrollment in course {string}', async (courseId: string) => {
	await createRequest(courseId, await learnerEmail());
});

When('the learner requests enrollment in course {string} with justification {string}', async (courseId: string, justification: string) => {
	await createRequest(courseId, await learnerEmail(), justification);
});

When('a client requests enrollment in course {string} for learner email {string}', (courseId: string, email: string) => createRequest(courseId, email));

When('the client retrieves the enrollment request', async () => {
	await actor().attemptsTo(Send.a(GetRequest.to(`${ENROLLMENT_REQUESTS}/${encodeURIComponent(await requestId())}`)));
});

When('the client retrieves the enrollment request {string}', (id: string) => actor().attemptsTo(Send.a(GetRequest.to(`${ENROLLMENT_REQUESTS}/${encodeURIComponent(id)}`))));

When("the client lists the learner's enrollment requests", async () => {
	await listFor(`learnerEmail=${encodeURIComponent(await learnerEmail())}`);
});

When("the client lists the learner's enrollment requests with {string}", async (query: string) => {
	await listFor(`learnerEmail=${encodeURIComponent(await learnerEmail())}&${query}`);
});

When("the client lists the learner's enrollment requests using an upper-case email", async () => {
	await listFor(`learnerEmail=${encodeURIComponent((await learnerEmail()).toUpperCase())}`);
});

When('the client lists enrollment requests with query {string}', (query: string) => listFor(query));

When('a reviewer changes the enrollment request status to {string} with reason {string}', async (status: string, reason: string) => {
	await changeStatus(await requestId(), status, reason);
});

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then('the enrollment API responds with status {int}', (status: number) => expectStatus(status));

Then('the enrollment API error code is {string}', (code: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the enrollment API error code', async (currentActor) => {
					const body = await currentActor.answer(enrollmentError());
					return body.error.code;
				}),
			),
			equals(code),
		),
	),
);

Then('the enrollment API error reports field {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`whether the enrollment API error reports ${field}`, async (currentActor) => {
					const body = await currentActor.answer(enrollmentError());
					return body.error.code === 'INVALID_REQUEST' && body.error.message === 'The request could not be completed.' && body.error.details.some((detail) => detail.field === field);
				}),
			),
			isTrue(),
		),
	),
);

Then('the enrollment API error reports field {string} with message {string}', (field: string, message: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(enrollmentError()),
			equals({
				error: {
					code: 'INVALID_REQUEST',
					message: 'The request could not be completed.',
					details: [{ field, message }],
				},
			}),
		),
	),
);

Then('the enrollment request has status {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the enrollment request status', async (currentActor) => {
					const body = await currentActor.answer(enrollmentRequest());
					return body.status;
				}),
			),
			equals(status),
		),
	),
);

Then('the enrollment request is for the learner and course {string}', async (courseId: string) => {
	const email = await learnerEmail();
	return actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the enrollment request learner and course', async (currentActor) => {
					const body = await currentActor.answer(enrollmentRequest());
					return { learnerEmail: body.learnerEmail, courseId: body.courseId, justification: body.justification };
				}),
			),
			equals({ learnerEmail: email, courseId, justification: VALID_JUSTIFICATION }),
		),
	);
});

Then('the enrollment request status history is:', (table: DataTable) => {
	const expected = table.hashes().map(({ fromStatus, toStatus, changedBy, reason }) => ({
		fromStatus: fromStatus === '' || fromStatus === undefined ? null : fromStatus,
		toStatus,
		changedBy,
		reason: reason === '' || reason === undefined ? null : reason,
	}));
	return actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the enrollment request status history', async (currentActor) => {
					const body = await currentActor.answer(enrollmentRequest());
					return body.statusHistory.map((entry) => ({ fromStatus: entry.fromStatus, toStatus: entry.toStatus, changedBy: entry.changedBy, reason: entry.reason }));
				}),
			),
			equals(expected),
		),
		Ensure.that(
			resolved(
				Question.about('whether the status history timestamps are ordered ISO dates ending at updatedAt', async (currentActor) => {
					const body = await currentActor.answer(enrollmentRequest());
					const times = body.statusHistory.map((entry) => entry.changedAt);
					const iso = times.every((time) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(time));
					const ordered = times.every((time, index) => index === 0 || Date.parse(times[index - 1] ?? '') <= Date.parse(time));
					return iso && ordered && times[0] === body.createdAt && times.at(-1) === body.updatedAt;
				}),
			),
			isTrue(),
		),
	);
});

Then('the latest status history entry is from {string} to {string} by {string} with reason {string}', (fromStatus: string, toStatus: string, changedBy: string, reason: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the latest status history entry', async (currentActor) => {
					const body = await currentActor.answer(enrollmentRequest());
					const latest = body.statusHistory.at(-1);
					return latest === undefined ? undefined : { fromStatus: latest.fromStatus, toStatus: latest.toStatus, changedBy: latest.changedBy, reason: latest.reason, changedAtIsUpdatedAt: latest.changedAt === body.updatedAt };
				}),
			),
			equals({ fromStatus, toStatus, changedBy, reason: reason === '' ? null : reason, changedAtIsUpdatedAt: true }),
		),
	),
);

Then('the listed enrollment requests are for courses:', (table: DataTable) => {
	const expected = table.raw().map((row) => row[0]);
	return actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the listed enrollment request courses', async (currentActor) => {
					const body = await currentActor.answer(enrollmentList());
					return { courses: body.items.map((item) => item.courseId), totalItems: body.totalItems };
				}),
			),
			equals({ courses: expected, totalItems: expected.length }),
		),
	);
});

Then('every listed enrollment request has status {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`the listed enrollment requests whose status is not ${status}`, async (currentActor) => {
					const body = await currentActor.answer(enrollmentList());
					return body.items.filter((item) => item.status !== status).map((item) => item.id);
				}),
			),
			equals([] as string[]),
		),
	),
);

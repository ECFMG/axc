import { randomUUID } from 'node:crypto';
import { Before, Given, Then, When } from '@cucumber/cucumber';
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

interface EnrollmentRequest {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: string;
	statusHistory: StatusHistoryEntry[];
}

const actor = () => actorCalled('API client');
const justification = 'I need this course to prepare for upcoming secure development work.';
const missingCourseId = '650000000000000000000999';
const reviewer = 'reviewer@example.org';

// Scenarios share one API process and database, so each uses its own learner email to isolate its data.
const scenario = { learnerEmail: '', requestId: '', courseId: '' };
const courseIds = new Map<string, string>();

Before(() => {
	scenario.learnerEmail = '';
	scenario.requestId = '';
	scenario.courseId = '';
});

async function courseIdFor(title: string): Promise<string> {
	const cached = courseIds.get(title);
	if (cached) {
		return cached;
	}
	await actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?q=${encodeURIComponent(title)}&pageSize=50`)));
	const { items } = await actor().answer(LastResponse.body<{ items: Array<{ id: string; title: string }> }>());
	const course = items.find((candidate) => candidate.title === title);
	if (!course) {
		throw new Error(`Seeded course "${title}" was not found through GET /api/courses`);
	}
	courseIds.set(title, course.id);
	return course.id;
}

const titleFor = (courseId: string): string => [...courseIds.entries()].find(([, id]) => id === courseId)?.[0] ?? courseId;

const lastRequest = <T>(description: string, read: (request: EnrollmentRequest) => T) => Question.about(description, async (currentActor) => read(await currentActor.answer(LastResponse.body<EnrollmentRequest>())));

const listedRequests = <T>(description: string, read: (items: EnrollmentRequest[]) => T) =>
	Question.about(description, async (currentActor) => read((await currentActor.answer(LastResponse.body<{ items: EnrollmentRequest[] }>())).items));

async function requestEnrollment(courseId: string, overrides: { learnerEmail?: string; justification?: string } = {}): Promise<void> {
	scenario.courseId = courseId;
	await actor().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with({ courseId, learnerEmail: scenario.learnerEmail, justification, ...overrides })));
}

const changeStatus = (body: Record<string, string>) => actor().attemptsTo(Send.a(PatchRequest.to(`/api/enrollment-requests/${scenario.requestId}/status`).with({ changedBy: reviewer, ...body })));

const listRequests = (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests?${query}&pageSize=50`)));

Given('a learner with a unique email address', () => {
	scenario.learnerEmail = `learner-${randomUUID()}@example.org`;
});

Given('the learner has a {string} enrollment request for {string}', async (status: string, title: string) => {
	await requestEnrollment(await courseIdFor(title));
	await actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(201)));
	scenario.requestId = await actor().answer(lastRequest('the new request id', (request) => request.id));
	// Walk the workflow to the wanted state: approved and rejected come from pending; cancelled here comes via approved.
	const path: Record<string, Array<Record<string, string>>> = {
		pending: [],
		approved: [{ status: 'approved' }],
		rejected: [{ status: 'rejected', reason: 'Prerequisite course not completed.' }],
		cancelled: [{ status: 'approved' }, { status: 'cancelled' }],
	};
	for (const step of path[status] ?? []) {
		await changeStatus(step);
		await actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(200)));
	}
});

When('the learner requests enrollment in {string}', async (title: string) => requestEnrollment(await courseIdFor(title)));

When('the learner requests enrollment in a course that does not exist', () => requestEnrollment(missingCourseId));

When('the learner requests enrollment in {string} using the email {string}', async (title: string, learnerEmail: string) => requestEnrollment(await courseIdFor(title), { learnerEmail }));

When('the learner requests enrollment in {string} with the justification {string}', async (title: string, text: string) => requestEnrollment(await courseIdFor(title), { justification: text }));

When('a reviewer changes the enrollment request status to {string} with the reason {string}', (status: string, reason: string) => changeStatus({ status, reason }));

When('a reviewer changes the enrollment request status to {string} without a reason', (status: string) => changeStatus({ status }));

When('the client retrieves the enrollment request', () => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${scenario.requestId}`))));

When('the client retrieves the enrollment request {string}', (id: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${encodeURIComponent(id)}`))));

When('the client lists enrollment requests for the learner', () => listRequests(`learnerEmail=${encodeURIComponent(scenario.learnerEmail)}`));

When('the client lists enrollment requests for the learner with status {string}', (status: string) => listRequests(`learnerEmail=${encodeURIComponent(scenario.learnerEmail)}&status=${status}`));

When('the client lists enrollment requests for the learner in {string}', async (title: string) => listRequests(`learnerEmail=${encodeURIComponent(scenario.learnerEmail)}&courseId=${await courseIdFor(title)}`));

When('the client lists enrollment requests with status {string} in {string}', async (status: string, title: string) => listRequests(`status=${status}&courseId=${await courseIdFor(title)}`));

When('the client lists enrollment requests with the query {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests?${query}`))));

Then('the enrollment request has status {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(lastRequest('the request status', (request) => request.status)), equals(status))));

Then('the enrollment request belongs to the learner and the course', () =>
	actor().attemptsTo(
		Ensure.that(resolved(lastRequest('the learner email', (request) => request.learnerEmail)), equals(scenario.learnerEmail)),
		Ensure.that(resolved(lastRequest('the course id', (request) => request.courseId)), equals(scenario.courseId)),
		Ensure.that(resolved(lastRequest('the justification', (request) => request.justification)), equals(justification)),
	),
);

Then('the enrollment request has {int} status history entry/entries', (count: number) =>
	actor().attemptsTo(Ensure.that(resolved(lastRequest('the number of status history entries', (request) => request.statusHistory.length)), equals(count))),
);

Then('the latest status history entry moved from {string} to {string} by {string}', (from: string, to: string, changedBy: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				lastRequest('the latest status history entry', (request) => {
					const entry = request.statusHistory.at(-1);
					return { from: entry?.fromStatus ?? 'none', to: entry?.toStatus, changedBy: entry?.changedBy, hasTimestamp: /^\d{4}-\d{2}-\d{2}T/.test(entry?.changedAt ?? '') };
				}),
			),
			equals({ from, to, changedBy, hasTimestamp: true }),
		),
	),
);

Then('the status history is {string}', (expected: string) =>
	actor().attemptsTo(Ensure.that(resolved(lastRequest('the status history', (request) => request.statusHistory.map((entry) => `${entry.fromStatus ?? 'none'}>${entry.toStatus}`).join(', '))), equals(expected))),
);

Then('the listed enrollment requests are for the courses {string}', (titles: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				listedRequests('the listed courses', (items) =>
					items
						.map((item) => titleFor(item.courseId))
						.sort()
						.join(', '),
				),
			),
			equals(
				titles
					.split(',')
					.map((title) => title.trim())
					.sort()
					.join(', '),
			),
		),
	),
);

Then('every listed enrollment request has status {string} and course {string}', async (status: string, title: string) => {
	const courseId = await courseIdFor(title);
	// courseIdFor may have issued a request; list again so LastResponse is the filtered list.
	await listRequests(`status=${status}&courseId=${courseId}`);
	await actor().attemptsTo(
		Ensure.that(resolved(listedRequests('the number of listed requests', (items) => items.length > 0)), equals(true)),
		Ensure.that(resolved(listedRequests('the listed requests not matching the filters', (items) => items.filter((item) => item.status !== status || item.courseId !== courseId).length)), equals(0)),
	);
});

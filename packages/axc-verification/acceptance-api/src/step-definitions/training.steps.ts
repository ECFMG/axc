import { Given, Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question, Task } from '@serenity-js/core';
import { CallAnApi, GetRequest, LastResponse, PatchRequest, PostRequest, Send } from '@serenity-js/rest';

interface Course {
	id: string;
	title: string;
	modality: string;
	status: string;
	createdAt: string;
	updatedAt: string;
}
interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
interface Enrollment {
	id: string;
	courseId: string;
	learnerEmail: string;
	status: string;
	createdAt: string;
	updatedAt: string;
	statusHistory: { fromStatus: string | null; toStatus: string; changedAt: string; changedBy: string; reason: string | null }[];
}
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;
const actor = () => actorCalled('Training learner');
let email: string;
let requestId: string;
const freshLearner = () => {
	email = `learner-${crypto.randomUUID()}@example.org`;
	requestId = 'missing';
};
const input = (courseId: string) => ({ courseId, learnerEmail: email, justification: 'I need this course for upcoming work.' });
const submitEnrollment = (body: unknown) => Task.where('#actor submits an enrollment request', Send.a(PostRequest.to('/api/enrollment-requests').with(body)));
const updateEnrollment = (status: string, reason: string) =>
	Task.where('#actor reviews an enrollment request', Send.a(PatchRequest.to(`/api/enrollment-requests/${requestId}/status`).with({ status, changedBy: 'reviewer@example.org', ...(reason.trim() === '' ? {} : { reason }) })));
const bodyMatches = <T>(description: string, predicate: (body: T) => boolean) =>
	Ensure.that(resolved(Question.about(description, async (currentActor) => predicate(await currentActor.answer(LastResponse.body<T>())))), equals(true));
Given('a training API client', () => {
	actor().abilityTo(CallAnApi);
});
Given('a fresh enrollment learner', freshLearner);
Given('an enrollment with status {string}', async (status: string) => {
	freshLearner();
	await actor().attemptsTo(submitEnrollment(input('course-001')), Ensure.that(resolved(LastResponse.status()), equals(201)));
	requestId = (await actor().answer(LastResponse.body<Enrollment>())).id;
	if (status !== 'pending') {
		await actor().attemptsTo(updateEnrollment(status, 'Reviewed prerequisites'), Ensure.that(resolved(LastResponse.status()), equals(200)));
	}
});
When('the catalog query {string} is sent', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));
Then('the training response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));
Then('the training error is {string}', (code: string) =>
	actor().attemptsTo(
		bodyMatches<{ error: { code: string; message: string; details: unknown[] } }>(
			'the error envelope',
			(body) => body.error.code === code && body.error.message.length > 0 && Array.isArray(body.error.details) && !/stack|_id|MongoServerError/.test(JSON.stringify(body)),
		),
	),
);
Then('the catalog uses default pagination', () =>
	actor().attemptsTo(bodyMatches<CoursePage>('default catalog metadata', (body) => body.page === 1 && body.pageSize === 10 && body.items.length === 10 && body.totalItems === 12 && body.totalPages === 2)),
);
Then('the course identifiers are {string}', (ids: string) =>
	actor().attemptsTo(bodyMatches<CoursePage>('matching course identifiers', (body) => JSON.stringify(body.items.map((course) => course.id).sort()) === JSON.stringify(ids === '' ? [] : ids.split(',').sort()))),
);
Then('every course has modality {string}', (modality: string) => actor().attemptsTo(bodyMatches<CoursePage>('matching modalities', (body) => body.items.length > 0 && body.items.every((course) => course.modality === modality))));
Then('every course has status {string}', (status: string) => actor().attemptsTo(bodyMatches<CoursePage>('matching statuses', (body) => body.items.length > 0 && body.items.every((course) => course.status === status))));
Then('the catalog page is {int} with page size {int}', (page: number, pageSize: number) =>
	actor().attemptsTo(bodyMatches<CoursePage>('requested pagination', (body) => body.page === page && body.pageSize === pageSize && body.items.length === pageSize && body.totalItems === 12 && body.totalPages === 3)),
);
Then('courses are ordered by {string}', (field: string) =>
	actor().attemptsTo(
		bodyMatches<CoursePage>('course sort order', (body) => {
			const values = body.items.map((course) => (field === 'createdAt' ? course.createdAt : field === 'updatedAt' ? course.updatedAt : course.title));
			return JSON.stringify(values) === JSON.stringify([...values].sort());
		}),
	),
);
When('the learner requests course {string}', (courseId: string) => actor().attemptsTo(submitEnrollment(input(courseId))));
When('an enrollment is submitted with email {string} and justification length {int}', (value: string, length: number) =>
	actor().attemptsTo(submitEnrollment({ ...input('course-001'), learnerEmail: value === 'fresh' ? email : value, justification: 'x'.repeat(length) })),
);
Then('the enrollment is pending with an initial audit event', () =>
	actor().attemptsTo(
		bodyMatches<Enrollment>(
			'pending enrollment and initial history',
			(body) =>
				body.status === 'pending' &&
				body.learnerEmail === email &&
				body.createdAt === body.updatedAt &&
				body.statusHistory.length === 1 &&
				body.statusHistory[0]?.fromStatus === null &&
				body.statusHistory[0]?.toStatus === 'pending' &&
				body.statusHistory[0]?.changedBy === 'system' &&
				body.statusHistory[0]?.changedAt === body.createdAt,
		),
	),
);
When('the enrollment is retrieved', () => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${requestId}`))));
When('an absent enrollment is retrieved', () => actor().attemptsTo(Send.a(GetRequest.to('/api/enrollment-requests/missing'))));
When('an absent enrollment is approved', () => actor().attemptsTo(updateEnrollment('approved', '')));
When('the enrollment status changes to {string} with reason {string}', (status: string, reason: string) => actor().attemptsTo(updateEnrollment(status, reason)));
Then('its audit trail contains {int} entries ending in {string}', (count: number, status: string) =>
	actor().attemptsTo(
		bodyMatches<Enrollment>(
			'ordered audit history',
			(body) =>
				body.status === status &&
				body.statusHistory.length === count &&
				body.statusHistory.at(-1)?.toStatus === status &&
				body.statusHistory.at(-1)?.changedBy === 'reviewer@example.org' &&
				body.statusHistory.at(-1)?.changedAt === body.updatedAt &&
				body.statusHistory[0]?.fromStatus === null,
		),
	),
);
When('enrollment requests are listed by {string}', (filter: string) => {
	const query =
		filter === 'status'
			? 'status=pending'
			: filter === 'courseId'
				? 'courseId=course-001'
				: filter === 'learnerEmail'
					? `learnerEmail=${encodeURIComponent(email.toUpperCase())}`
					: `status=pending&courseId=course-001&learnerEmail=${encodeURIComponent(email)}`;
	return actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests?${query}`)));
});
Then('the listed enrollments match {string}', (filter: string) =>
	actor().attemptsTo(
		bodyMatches<{ items: Enrollment[] }>(
			'filtered enrollment collection',
			(body) =>
				body.items.some((item) => item.id === requestId) &&
				body.items.every((item) =>
					filter === 'status'
						? item.status === 'pending'
						: filter === 'courseId'
							? item.courseId === 'course-001'
							: filter === 'learnerEmail'
								? item.learnerEmail === email
								: item.learnerEmail === email && item.courseId === 'course-001' && item.status === 'pending',
				),
		),
	),
);

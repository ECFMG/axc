import { Given, Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question, Task } from '@serenity-js/core';
import { GetRequest, LastResponse, PatchRequest, PostRequest, Send } from '@serenity-js/rest';

interface EnrollmentBody {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: string;
	createdAt: string;
	updatedAt: string;
	statusHistory: { fromStatus: string | null; toStatus: string; changedAt: string; changedBy: string; reason: string | null }[];
}
interface CourseBody {
	id: string;
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}
interface CoursePageBody {
	items: CourseBody[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;
const actor = () => actorCalled('Training learner');
let learnerEmail: string;
let requestId: string;
let selectedFilter: string;
const coursePath = '/api/courses';
const enrollmentPath = '/api/enrollment-requests';
const submitEnrollment = (courseId: string, email: string, length: number) =>
	Task.where('#actor submits an enrollment request', Send.a(PostRequest.to(enrollmentPath).with({ courseId, learnerEmail: email, justification: 'x'.repeat(length) })));
const changeStatus = (id: string, status: string, reason: string) =>
	Task.where(
		'#actor reviews an enrollment request',
		Send.a(PatchRequest.to(`${enrollmentPath}/${id}/status`).with({ status, changedBy: 'reviewer@example.org', ...(reason === 'omitted' ? {} : { reason: reason === 'blank' ? '   ' : reason }) })),
	);
const responseMatches = <T>(description: string, predicate: (body: T) => boolean) => Question.about(description, async (currentActor) => predicate(await currentActor.answer(LastResponse.body<T>())));
const ensureBody = <T>(description: string, predicate: (body: T) => boolean) => actor().attemptsTo(Ensure.that(resolved(responseMatches(description, predicate)), equals(true)));
const ensureStatus = (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status)));

Given('a fresh learner', () => {
	learnerEmail = `learner-${crypto.randomUUID()}@example.org`;
	requestId = 'missing';
});
Given('a {string} enrollment request', async (status: string) => {
	learnerEmail = `learner-${crypto.randomUUID()}@example.org`;
	await actor().attemptsTo(submitEnrollment('course-001', learnerEmail, 20));
	await ensureStatus(201);
	requestId = (await actor().answer(LastResponse.body<EnrollmentBody>())).id;
	if (status !== 'pending') {
		await actor().attemptsTo(changeStatus(requestId, status, 'Fixture decision'));
		await ensureStatus(200);
	}
});
Given('two requests for different learners and courses', async () => {
	learnerEmail = `learner-${crypto.randomUUID()}@example.org`;
	await actor().attemptsTo(submitEnrollment('course-001', learnerEmail, 20));
	await ensureStatus(201);
	requestId = (await actor().answer(LastResponse.body<EnrollmentBody>())).id;
	await actor().attemptsTo(submitEnrollment('course-002', `other-${crypto.randomUUID()}@example.org`, 20));
	await ensureStatus(201);
	const otherId = (await actor().answer(LastResponse.body<EnrollmentBody>())).id;
	await actor().attemptsTo(changeStatus(otherId, 'approved', 'omitted'));
	await ensureStatus(200);
});
When('the learner searches courses with {string}', (query: string) => actor().attemptsTo(Task.where('#actor searches courses', Send.a(GetRequest.to(`${coursePath}?${query}`)))));
Then('the course page has page {int} size {int} and total {int}', async (page: number, size: number, total: number) => {
	await ensureStatus(200);
	await ensureBody<CoursePageBody>(
		'pagination metadata',
		(body) => body.page === page && body.pageSize === size && body.totalItems === total && body.items.length === Math.min(size, total - (page - 1) * size) && body.totalPages === Math.ceil(total / size),
	);
});
Then('every course matches field {string} value {string}', async (field: string, value: string) => {
	await ensureStatus(200);
	await ensureBody<CoursePageBody>('matching courses', (body) => body.items.length > 0 && body.items.every((course) => (field === 'tags' ? course.tags.includes(value) : course[field as 'modality' | 'status'] === value)));
});
Then('the course page includes {string}', async (title: string) => {
	await ensureStatus(200);
	await ensureBody<CoursePageBody>('keyword match', (body) => body.items.some((course) => course.title === title));
});
Then('courses are sorted by {string}', async (field: string) => {
	await ensureStatus(200);
	await ensureBody<CoursePageBody>('ascending course order', (body) => {
		const values = body.items.map((course) => course[field as 'title' | 'createdAt' | 'updatedAt']);
		return values.length === 12 && values.every((value, index) => index === 0 || value >= (values[index - 1] ?? ''));
	});
});
Then('the course page has {int} items and {int} total pages', async (count: number, totalPages: number) => {
	await ensureStatus(200);
	await ensureBody<CoursePageBody>('empty course page', (body) => body.items.length === count && body.totalItems === 0 && body.totalPages === totalPages);
});
When('the learner requests course {string} with email {string} and justification length {int}', (course: string, email: string, length: number) =>
	actor().attemptsTo(submitEnrollment(course, email === 'valid' ? learnerEmail : 'invalid', length)),
);
When('the learner repeats the enrollment with uppercase email', () => actor().attemptsTo(submitEnrollment('course-001', learnerEmail.toUpperCase(), 20)));
Then('a pending enrollment is created with {int} system history entry', async (entries: number) => {
	await ensureStatus(201);
	await ensureBody<EnrollmentBody>(
		'pending enrollment and audit',
		(body) =>
			body.id.length > 0 &&
			body.courseId === 'course-001' &&
			body.learnerEmail === learnerEmail &&
			body.status === 'pending' &&
			body.statusHistory.length === entries &&
			body.statusHistory[0]?.fromStatus === null &&
			body.statusHistory[0]?.toStatus === 'pending' &&
			body.statusHistory[0]?.changedBy === 'system' &&
			body.statusHistory[0]?.reason === null &&
			body.createdAt === body.statusHistory[0]?.changedAt &&
			Number.isFinite(Date.parse(body.createdAt)),
	);
});
When('the learner retrieves the enrollment', () => actor().attemptsTo(Send.a(GetRequest.to(`${enrollmentPath}/${requestId}`))));
When('the learner retrieves a missing enrollment', () => actor().attemptsTo(Send.a(GetRequest.to(`${enrollmentPath}/missing`))));
When('the learner lists enrollments using {string}', (filter: string) => {
	selectedFilter = filter;
	const filters = { status: 'pending', courseId: 'course-001', learnerEmail };
	const query = filter === 'combined' ? new URLSearchParams(filters) : new URLSearchParams({ [filter]: filters[filter as keyof typeof filters] });
	return actor().attemptsTo(Task.where('#actor filters enrollment requests', Send.a(GetRequest.to(`${enrollmentPath}?${query.toString()}`))));
});
Then('every listed request matches the selected enrollment filters', async () => {
	await ensureStatus(200);
	await ensureBody<EnrollmentBody[]>(
		'matching enrollment list',
		(body) =>
			body.some((record) => record.id === requestId) &&
			body.every(
				(record) =>
					((selectedFilter !== 'status' && selectedFilter !== 'combined') || record.status === 'pending') &&
					((selectedFilter !== 'courseId' && selectedFilter !== 'combined') || record.courseId === 'course-001') &&
					((selectedFilter !== 'learnerEmail' && selectedFilter !== 'combined') || record.learnerEmail === learnerEmail),
			),
	);
});
When('the learner lists enrollments for an unknown course', () => actor().attemptsTo(Send.a(GetRequest.to(`${enrollmentPath}?courseId=no-such-course`))));
Then('the enrollment list contains {int} requests', async (count: number) => {
	await ensureStatus(200);
	await ensureBody<EnrollmentBody[]>('empty enrollment list', (body) => body.length === count);
});
When('the reviewer changes status to {string} with reason {string}', (status: string, reason: string) => actor().attemptsTo(changeStatus(requestId, status, reason)));
When('the reviewer changes a missing enrollment to approved', () => actor().attemptsTo(changeStatus('missing', 'approved', 'omitted')));
Then('the enrollment has status {string} and {int} history entries', async (status: string, entries: number) => {
	await ensureStatus(200);
	await ensureBody<EnrollmentBody>(
		'enrollment status and history',
		(body) =>
			body.id === requestId &&
			body.status === status &&
			body.statusHistory.length === entries &&
			body.statusHistory[entries - 1]?.toStatus === status &&
			body.statusHistory[0]?.fromStatus === null &&
			body.createdAt === body.statusHistory[0]?.changedAt &&
			body.updatedAt === body.statusHistory[entries - 1]?.changedAt,
	);
});
Then('the latest history records reviewer {string} from {string} with reason {string}', (reviewer: string, from: string, reason: string) =>
	ensureBody<EnrollmentBody>('latest audit entry', (body) => {
		const entry = body.statusHistory.at(-1);
		return entry?.changedBy === reviewer && entry.fromStatus === from && entry.reason === (reason === 'omitted' ? null : reason) && Number.isFinite(Date.parse(entry.changedAt));
	}),
);
Then('training responds {int} with error {string}', async (status: number, code: string) => {
	await ensureStatus(status);
	await ensureBody<{ error: { code: string; message: string; details: unknown[] } }>(
		'safe error envelope',
		(body) => body.error.code === code && typeof body.error.message === 'string' && Array.isArray(body.error.details) && !('stack' in body.error),
	);
});

const matchesKeyword = (course: CourseBody, keyword: string): boolean => [course.title, course.summary, ...course.tags].some((text) => text.toLowerCase().includes(keyword.toLowerCase()));
Then('every course matches keyword {string}, modality {string}, and status {string}', async (keyword: string, modality: string, status: string) => {
	await ensureStatus(200);
	await ensureBody<CoursePageBody>(
		'all keyword modality and status predicates',
		(body) => body.items.length > 0 && body.items.every((course) => matchesKeyword(course, keyword) && course.modality === modality && course.status === status),
	);
});
Then('every course matches keyword {string}, tag {string}, and status {string}', async (keyword: string, tag: string, status: string) => {
	await ensureStatus(200);
	await ensureBody<CoursePageBody>(
		'all keyword tag and status predicates',
		(body) => body.items.length > 0 && body.items.every((course) => matchesKeyword(course, keyword) && course.tags.some((value) => value.toLowerCase() === tag.toLowerCase()) && course.status === status),
	);
});

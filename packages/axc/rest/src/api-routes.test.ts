import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildApplicationServicesFactory } from '@axc/application-services';
import { createRestApp } from './index.ts';

const JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';

interface ErrorBody {
	error: {
		code: string;
		message: string;
		details: Array<{ field: string; message: string }>;
	};
}

interface CoursePage {
	items: Array<{ id: string; title: string; tags: string[] }>;
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface EnrollmentBody {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: string;
	createdAt: string;
	updatedAt: string;
	statusHistory: Array<{ fromStatus: string | null; toStatus: string; changedAt: string; changedBy: string; reason: string | null }>;
}

function createApp() {
	return createRestApp(buildApplicationServicesFactory({ environment: 'test' }));
}

function requestFor(courseId: string, learnerEmail = 'learner@example.org') {
	return { courseId, learnerEmail, justification: JUSTIFICATION };
}

function postEnrollment(app: ReturnType<typeof createApp>, body: unknown) {
	return app.request('/api/enrollment-requests', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});
}

function patchStatus(app: ReturnType<typeof createApp>, id: string, body: unknown) {
	return app.request(`/api/enrollment-requests/${id}/status`, {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});
}

async function expectError(response: Response, status: number, code: string, field?: string): Promise<void> {
	assert.equal(response.status, status);
	const body = (await response.json()) as ErrorBody;
	assert.equal(body.error.code, code);
	assert.equal(typeof body.error.message, 'string');
	assert.ok(Array.isArray(body.error.details));
	if (field !== undefined) {
		assert.ok(body.error.details.some((detail) => detail.field === field));
	}
}

describe('GET /api/courses', () => {
	it('returns the default page and keeps the healthcheck available', async () => {
		const app = createApp();
		const health = await app.request('/health');
		assert.equal(health.status, 200);
		const healthBody = (await health.json()) as { status: string; service: string };
		assert.equal(healthBody.status, 'ok');
		assert.equal(healthBody.service, 'agentCourses-api');

		const response = await app.request('/api/courses');
		assert.equal(response.status, 200);
		const body = (await response.json()) as CoursePage;
		assert.equal(body.page, 1);
		assert.equal(body.pageSize, 10);
		assert.equal(body.totalItems, 12);
		assert.equal(body.totalPages, 2);
		assert.equal(body.items.length, 10);
		assert.equal(body.items[0]?.title, 'Accessible Content Design');
	});

	it('searches, filters, paginates, and sorts', async () => {
		const app = createApp();
		const searched = (await (await app.request('/api/courses?q=SECURITY')).json()) as CoursePage;
		assert.deepEqual(
			searched.items.map((course) => course.id),
			['course-001', 'course-006', 'course-011', 'course-002'],
		);

		const combined = (await (await app.request('/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title')).json()) as CoursePage;
		assert.equal(combined.totalItems, 1);
		assert.equal(combined.items[0]?.id, 'course-001');
		assert.deepEqual(combined.items[0]?.tags, ['ai', 'security']);

		const created = (await (await app.request('/api/courses?sort=createdAt&pageSize=1')).json()) as CoursePage;
		assert.equal(created.items[0]?.id, 'course-012');

		const empty = (await (await app.request('/api/courses?q=zzzz-not-a-course')).json()) as CoursePage;
		assert.deepEqual(empty, { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	it('returns 400 for invalid query parameters', async () => {
		const app = createApp();
		const response = await app.request('/api/courses?pageSize=51');
		assert.equal(response.status, 400);
		const body = (await response.json()) as ErrorBody;
		assert.equal(body.error.code, 'INVALID_QUERY_PARAMETER');
		assert.equal(body.error.message, 'One or more query parameters are invalid.');
		assert.deepEqual(body.error.details, [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]);

		await expectError(await app.request('/api/courses?modality=classroom'), 400, 'INVALID_QUERY_PARAMETER', 'modality');
		await expectError(await app.request('/api/courses?status=open'), 400, 'INVALID_QUERY_PARAMETER', 'status');
		await expectError(await app.request('/api/courses?page=0'), 400, 'INVALID_QUERY_PARAMETER', 'page');
		await expectError(await app.request('/api/courses?sort=name'), 400, 'INVALID_QUERY_PARAMETER', 'sort');
	});
});

describe('enrollment request routes', () => {
	it('creates, retrieves, and lists a pending request', async () => {
		const app = createApp();
		const createdResponse = await postEnrollment(app, requestFor('course-001', 'Learner@Example.org'));
		assert.equal(createdResponse.status, 201);
		const created = (await createdResponse.json()) as EnrollmentBody;
		assert.equal(created.status, 'pending');
		assert.equal(created.learnerEmail, 'learner@example.org');
		assert.equal(created.id, 'enroll-001');
		assert.deepEqual(created.statusHistory, [{ fromStatus: null, toStatus: 'pending', changedAt: created.createdAt, changedBy: 'system', reason: null }]);

		const fetched = (await (await app.request(`/api/enrollment-requests/${created.id}`)).json()) as EnrollmentBody;
		assert.deepEqual(fetched, created);

		const listed = (await (await app.request('/api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org')).json()) as { items: EnrollmentBody[] };
		assert.deepEqual(
			listed.items.map((request) => request.id),
			[created.id],
		);
	});

	it('returns the course and validation errors', async () => {
		const app = createApp();
		await expectError(await postEnrollment(app, requestFor('course-999')), 404, 'COURSE_NOT_FOUND', 'courseId');
		await expectError(await postEnrollment(app, requestFor('course-004')), 409, 'COURSE_NOT_ACTIVE', 'courseId');
		await expectError(await postEnrollment(app, requestFor('course-005')), 409, 'COURSE_NOT_ACTIVE', 'courseId');
		await expectError(await postEnrollment(app, { courseId: 'course-001', learnerEmail: 'not-an-email', justification: JUSTIFICATION }), 400, 'INVALID_REQUEST', 'learnerEmail');
		await expectError(await postEnrollment(app, { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'too short' }), 400, 'INVALID_REQUEST', 'justification');
		await expectError(await postEnrollment(app, 'not-json-object'), 400, 'INVALID_REQUEST', 'body');

		const invalidJson = await app.request('/api/enrollment-requests', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: '{',
		});
		await expectError(invalidJson, 400, 'INVALID_REQUEST', 'body');
	});

	it('prevents duplicate active requests', async () => {
		const app = createApp();
		const pending = (await (await postEnrollment(app, requestFor('course-001'))).json()) as EnrollmentBody;
		await expectError(await postEnrollment(app, requestFor('course-001')), 409, 'DUPLICATE_ACTIVE_REQUEST', 'learnerEmail');

		assert.equal((await patchStatus(app, pending.id, { status: 'approved', changedBy: 'reviewer@example.org' })).status, 200);
		await expectError(await postEnrollment(app, requestFor('course-001')), 409, 'DUPLICATE_ACTIVE_REQUEST');

		assert.equal((await patchStatus(app, pending.id, { status: 'cancelled', changedBy: 'reviewer@example.org' })).status, 200);
		assert.equal((await postEnrollment(app, requestFor('course-001'))).status, 201);
	});

	it('transitions status, requires a rejection reason, and records history', async () => {
		const app = createApp();
		const created = (await (await postEnrollment(app, requestFor('course-001'))).json()) as EnrollmentBody;

		await expectError(await patchStatus(app, created.id, { status: 'rejected', changedBy: 'reviewer@example.org' }), 400, 'INVALID_REQUEST', 'reason');
		await expectError(await patchStatus(app, created.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: ' ' }), 400, 'INVALID_REQUEST', 'reason');
		await expectError(await patchStatus(app, 'enroll-missing', { status: 'approved', changedBy: 'reviewer@example.org' }), 404, 'ENROLLMENT_REQUEST_NOT_FOUND', 'id');
		await expectError(await patchStatus(app, created.id, { status: 'bogus', changedBy: 'reviewer@example.org' }), 400, 'INVALID_REQUEST', 'status');

		const rejectedResponse = await patchStatus(app, created.id, {
			status: 'rejected',
			changedBy: 'reviewer@example.org',
			reason: 'Learner has not completed the prerequisite course.',
		});
		assert.equal(rejectedResponse.status, 200);
		const rejected = (await rejectedResponse.json()) as EnrollmentBody;
		assert.equal(rejected.status, 'rejected');
		assert.deepEqual(
			rejected.statusHistory.map((entry) => entry.toStatus),
			['pending', 'rejected'],
		);
		assert.equal(rejected.statusHistory[1]?.reason, 'Learner has not completed the prerequisite course.');
		await expectError(await patchStatus(app, created.id, { status: 'approved', changedBy: 'reviewer@example.org' }), 409, 'INVALID_STATUS_TRANSITION', 'status');

		const other = (await (await postEnrollment(app, requestFor('course-002'))).json()) as EnrollmentBody;
		const approved = (await (await patchStatus(app, other.id, { status: 'approved', changedBy: 'reviewer@example.org' })).json()) as EnrollmentBody;
		assert.equal(approved.status, 'approved');
		const cancelled = (await (await patchStatus(app, other.id, { status: 'cancelled', changedBy: 'reviewer@example.org' })).json()) as EnrollmentBody;
		assert.deepEqual(
			cancelled.statusHistory.map((entry) => `${entry.fromStatus ?? 'null'}->${entry.toStatus}`),
			['null->pending', 'pending->approved', 'approved->cancelled'],
		);

		const third = (await (await postEnrollment(app, requestFor('course-003'))).json()) as EnrollmentBody;
		assert.equal(((await (await patchStatus(app, third.id, { status: 'cancelled', changedBy: 'reviewer@example.org' })).json()) as EnrollmentBody).status, 'cancelled');
	});
});

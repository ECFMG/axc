import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildApplicationServicesFactory } from '@axc/application-services';
import { createRestApp } from './index.ts';

const NOW = '2026-06-27T10:00:00.000Z';
const JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';

describe('HTTP course search and enrollment requests', () => {
	it('keeps the healthcheck and course search routes', async () => {
		const application = app();
		const health = await send(application, '/health');
		assert.equal(health.status, 200);
		assert.equal(record(health.body).status, 'ok');

		const courses = await send(application, '/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title');
		assert.equal(courses.status, 200);
		const page = record(courses.body);
		assert.equal(page.totalItems, 1);
		const items = page.items;
		assert.ok(Array.isArray(items));
		assert.equal(record(items[0]).id, 'course-001');

		const invalid = await send(application, '/api/courses?pageSize=0');
		assert.equal(invalid.status, 400);
		assert.equal(errorCode(invalid.body), 'INVALID_QUERY_PARAMETER');

		const empty = await send(application, '/api/courses?q=zzzz-no-course');
		assert.equal(empty.status, 200);
		assert.deepEqual(record(empty.body).items, []);
	});

	it('creates, reads, filters, and audits an enrollment request', async () => {
		const application = app();
		const created = await sendJson(application, '/api/enrollment-requests', 'POST', requestBody());
		assert.equal(created.status, 201);
		assert.equal(record(created.body).status, 'pending');
		assert.equal(record(created.body).id, 'enroll-001');
		const history = record(created.body).statusHistory;
		assert.ok(Array.isArray(history));
		assert.equal(history.length, 1);
		assert.equal(record(history[0]).fromStatus, null);
		assert.equal(record(history[0]).changedBy, 'system');

		const fetched = await send(application, '/api/enrollment-requests/enroll-001');
		assert.equal(fetched.status, 200);
		assert.equal(record(fetched.body).courseId, 'course-001');

		const listed = await send(application, '/api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org');
		assert.equal(listed.status, 200);
		const items = record(listed.body).items;
		assert.ok(Array.isArray(items));
		assert.equal(items.length, 1);

		const missing = await send(application, '/api/enrollment-requests/enroll-404');
		assert.equal(missing.status, 404);
		assert.equal(errorCode(missing.body), 'ENROLLMENT_REQUEST_NOT_FOUND');
	});

	it('returns the required create and update errors', async () => {
		const application = app();
		const missingCourse = await sendJson(application, '/api/enrollment-requests', 'POST', requestBody({ courseId: 'course-404' }));
		assert.equal(missingCourse.status, 404);
		assert.equal(errorCode(missingCourse.body), 'COURSE_NOT_FOUND');
		const draft = await sendJson(application, '/api/enrollment-requests', 'POST', requestBody({ courseId: 'course-003' }));
		assert.equal(draft.status, 409);
		assert.equal(errorCode(draft.body), 'COURSE_NOT_ACTIVE');
		const retired = await sendJson(application, '/api/enrollment-requests', 'POST', requestBody({ courseId: 'course-006' }));
		assert.equal(retired.status, 409);
		assert.equal(errorCode(retired.body), 'COURSE_NOT_ACTIVE');
		assert.equal((await sendJson(application, '/api/enrollment-requests', 'POST', requestBody({ learnerEmail: 'not-an-email' }))).status, 400);
		assert.equal(errorCode((await sendJson(application, '/api/enrollment-requests', 'POST', requestBody({ justification: 'too short' }))).body), 'INVALID_REQUEST');

		await sendJson(application, '/api/enrollment-requests', 'POST', requestBody());
		const duplicate = await sendJson(application, '/api/enrollment-requests', 'POST', requestBody());
		assert.equal(duplicate.status, 409);
		assert.equal(errorCode(duplicate.body), 'DUPLICATE_ACTIVE_REQUEST');

		const approved = await sendJson(application, '/api/enrollment-requests/enroll-001/status', 'PATCH', { status: 'approved', changedBy: 'reviewer@example.org' });
		assert.equal(approved.status, 200);
		const duplicateApproved = await sendJson(application, '/api/enrollment-requests', 'POST', requestBody());
		assert.equal(duplicateApproved.status, 409);
		assert.equal(errorCode(duplicateApproved.body), 'DUPLICATE_ACTIVE_REQUEST');
	});

	it('follows the status transitions and keeps the audit trail', async () => {
		const application = app();
		await sendJson(application, '/api/enrollment-requests', 'POST', requestBody());
		const rejected = await sendJson(application, '/api/enrollment-requests/enroll-001/status', 'PATCH', {
			status: 'rejected',
			changedBy: 'reviewer@example.org',
			reason: 'Learner has not completed the prerequisite course.',
		});
		assert.equal(rejected.status, 200);
		const rejectedHistory = record(rejected.body).statusHistory;
		assert.ok(Array.isArray(rejectedHistory));
		assert.equal(rejectedHistory.length, 2);
		assert.equal(record(rejectedHistory[1]).reason, 'Learner has not completed the prerequisite course.');

		const second = app();
		await sendJson(second, '/api/enrollment-requests', 'POST', requestBody());
		assert.equal((await sendJson(second, '/api/enrollment-requests/enroll-001/status', 'PATCH', { status: 'cancelled', changedBy: 'learner@example.org' })).status, 200);

		const third = app();
		await sendJson(third, '/api/enrollment-requests', 'POST', requestBody());
		assert.equal((await sendJson(third, '/api/enrollment-requests/enroll-001/status', 'PATCH', { status: 'approved', changedBy: 'reviewer@example.org' })).status, 200);
		assert.equal((await sendJson(third, '/api/enrollment-requests/enroll-001/status', 'PATCH', { status: 'cancelled', changedBy: 'reviewer@example.org' })).status, 200);
		const invalid = await sendJson(third, '/api/enrollment-requests/enroll-001/status', 'PATCH', {
			status: 'approved',
			changedBy: 'reviewer@example.org',
		});
		assert.equal(invalid.status, 409);
		assert.equal(errorCode(invalid.body), 'INVALID_STATUS_TRANSITION');

		const open = app();
		await sendJson(open, '/api/enrollment-requests', 'POST', requestBody());
		const noReason = await sendJson(open, '/api/enrollment-requests/enroll-001/status', 'PATCH', { status: 'rejected', changedBy: 'reviewer@example.org' });
		assert.equal(noReason.status, 400);
		assert.equal(errorCode(noReason.body), 'INVALID_REQUEST');
		const stillPending = await send(open, '/api/enrollment-requests/enroll-001');
		assert.equal(record(stillPending.body).status, 'pending');
		const pendingHistory = record(stillPending.body).statusHistory;
		assert.ok(Array.isArray(pendingHistory));
		assert.equal(pendingHistory.length, 1);
	});
});

function app(now: () => string = () => NOW) {
	return createRestApp(buildApplicationServicesFactory({ environment: 'test' }, { now }));
}

function requestBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		courseId: 'course-001',
		learnerEmail: 'learner@example.org',
		justification: JUSTIFICATION,
		...overrides,
	};
}

async function send(application: ReturnType<typeof createRestApp>, path: string): Promise<{ status: number; body: unknown }> {
	const response = await application.request(`http://localhost${path}`);
	return { status: response.status, body: await response.json() };
}

async function sendJson(application: ReturnType<typeof createRestApp>, path: string, method: string, payload: unknown): Promise<{ status: number; body: unknown }> {
	const response = await application.request(`http://localhost${path}`, {
		method,
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(payload),
	});
	return { status: response.status, body: await response.json() };
}

function record(value: unknown): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new Error('expected a JSON object');
	}
	return value as Record<string, unknown>;
}

function errorCode(value: unknown): string {
	const error = record(record(value).error);
	return text(error, 'code');
}

function text(value: Record<string, unknown>, field: string): string {
	const found = value[field];
	if (typeof found !== 'string') {
		throw new Error(`expected ${field} to be a string`);
	}
	return found;
}

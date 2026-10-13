import { buildApplicationServicesFactory } from '@axc/application-services';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

interface CourseListResponse {
	items: Array<{
		id: string;
		title: string;
		summary: string;
		modality: string;
		status: string;
		tags: string[];
		createdAt: string;
		updatedAt: string;
	}>;
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface CourseErrorResponse {
	error: {
		code: string;
		message: string;
		details: Array<{ field: string; message: string }>;
	};
}

function app() {
	return createRestApp(buildApplicationServicesFactory({ environment: 'test' }));
}

describe('GET /api/courses', () => {
	it('returns the default paginated catalog', async () => {
		const response = await app().request('/api/courses');
		expect(response.status).toBe(200);

		const body = (await response.json()) as CourseListResponse;
		expect(body.page).toBe(1);
		expect(body.pageSize).toBe(10);
		expect(body.items).toHaveLength(10);
		expect(body.totalItems).toBeGreaterThanOrEqual(12);
		expect(body.totalPages).toBe(Math.ceil(body.totalItems / 10));
		expect(body.items[0]?.id).toBeDefined();
		expect(body.items[0]?.title).toBeDefined();
	});

	it('filters by keyword, modality, and status together', async () => {
		const response = await app().request('/api/courses?q=security&modality=online&status=active');
		expect(response.status).toBe(200);

		const body = (await response.json()) as CourseListResponse;
		expect(body.items.length).toBeGreaterThan(0);
		for (const course of body.items) {
			const haystack = `${course.title} ${course.summary} ${course.tags.join(' ')}`.toLowerCase();
			expect(haystack.includes('security')).toBe(true);
			expect(course.modality).toBe('online');
			expect(course.status).toBe('active');
		}
	});

	it('returns HTTP 400 for invalid query parameters', async () => {
		const response = await app().request('/api/courses?modality=remote&pageSize=99');
		expect(response.status).toBe(400);

		const body = (await response.json()) as CourseErrorResponse;
		expect(body.error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(body.error.message).toBe('One or more query parameters are invalid.');
		expect(body.error.details.map((detail) => detail.field)).toStrictEqual(['modality', 'pageSize']);
	});

	it('returns an empty items array when nothing matches', async () => {
		const response = await app().request('/api/courses?q=zzzz-no-such-course');
		expect(response.status).toBe(200);

		const body = (await response.json()) as CourseListResponse;
		expect(body.items).toStrictEqual([]);
		expect(body.totalItems).toBe(0);
		expect(body.page).toBe(1);
		expect(body.pageSize).toBe(10);
	});
});

interface EnrollmentRequestResponse {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: string;
	createdAt: string;
	updatedAt: string;
	statusHistory: Array<{
		fromStatus: string | null;
		toStatus: string;
		changedAt: string;
		changedBy: string;
		reason: string | null;
	}>;
}

interface EnrollmentRequestListResponse {
	items: EnrollmentRequestResponse[];
}

const VALID_JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';

function jsonRequest(method: string, path: string, body: unknown): Request {
	return new Request(`http://localhost${path}`, {
		method,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
}

describe('enrollment request HTTP API', () => {
	it('creates a pending enrollment request', async () => {
		const response = await app().request(
			jsonRequest('POST', '/api/enrollment-requests', {
				courseId: 'course-001',
				learnerEmail: 'learner@example.org',
				justification: VALID_JUSTIFICATION,
			}),
		);
		expect(response.status).toBe(201);

		const body = (await response.json()) as EnrollmentRequestResponse;
		expect(body.status).toBe('pending');
		expect(body.statusHistory).toHaveLength(1);
		expect(body.statusHistory[0]?.fromStatus).toBeNull();
		expect(body.statusHistory[0]?.toStatus).toBe('pending');
	});

	it('returns 404 when the course does not exist', async () => {
		const response = await app().request(
			jsonRequest('POST', '/api/enrollment-requests', {
				courseId: 'course-missing',
				learnerEmail: 'learner@example.org',
				justification: VALID_JUSTIFICATION,
			}),
		);
		expect(response.status).toBe(404);
		const body = (await response.json()) as CourseErrorResponse;
		expect(body.error.code).toBe('COURSE_NOT_FOUND');
	});

	it('returns 409 when the course is not active', async () => {
		const response = await app().request(
			jsonRequest('POST', '/api/enrollment-requests', {
				courseId: 'course-003',
				learnerEmail: 'learner@example.org',
				justification: VALID_JUSTIFICATION,
			}),
		);
		expect(response.status).toBe(409);
		const body = (await response.json()) as CourseErrorResponse;
		expect(body.error.code).toBe('COURSE_NOT_ACTIVE');
	});

	it('returns 400 for invalid email or short justification', async () => {
		const response = await app().request(
			jsonRequest('POST', '/api/enrollment-requests', {
				courseId: 'course-001',
				learnerEmail: 'not-an-email',
				justification: 'too short',
			}),
		);
		expect(response.status).toBe(400);
		const body = (await response.json()) as CourseErrorResponse;
		expect(body.error.code).toBe('INVALID_REQUEST');
	});

	it('returns 409 for a duplicate pending request', async () => {
		const client = app();
		const payload = {
			courseId: 'course-001',
			learnerEmail: 'duplicate@example.org',
			justification: VALID_JUSTIFICATION,
		};
		expect((await client.request(jsonRequest('POST', '/api/enrollment-requests', payload))).status).toBe(201);
		const duplicate = await client.request(jsonRequest('POST', '/api/enrollment-requests', payload));
		expect(duplicate.status).toBe(409);
		const body = (await duplicate.json()) as CourseErrorResponse;
		expect(body.error.code).toBe('DUPLICATE_ACTIVE_REQUEST');
	});

	it('retrieves, lists, and transitions a request while appending history', async () => {
		const client = app();
		const createdResponse = await client.request(
			jsonRequest('POST', '/api/enrollment-requests', {
				courseId: 'course-001',
				learnerEmail: 'flow@example.org',
				justification: VALID_JUSTIFICATION,
			}),
		);
		const created = (await createdResponse.json()) as EnrollmentRequestResponse;

		const fetched = await client.request(`/api/enrollment-requests/${created.id}`);
		expect(fetched.status).toBe(200);
		const fetchedBody = (await fetched.json()) as EnrollmentRequestResponse;
		expect(fetchedBody.id).toBe(created.id);
		expect(fetchedBody.statusHistory).toHaveLength(1);

		const listed = await client.request('/api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=flow@example.org');
		expect(listed.status).toBe(200);
		const listedBody = (await listed.json()) as EnrollmentRequestListResponse;
		expect(listedBody.items).toHaveLength(1);

		const approved = await client.request(jsonRequest('PATCH', `/api/enrollment-requests/${created.id}/status`, { status: 'approved', changedBy: 'reviewer@example.org' }));
		expect(approved.status).toBe(200);
		const approvedBody = (await approved.json()) as EnrollmentRequestResponse;
		expect(approvedBody.status).toBe('approved');
		expect(approvedBody.statusHistory).toHaveLength(2);

		const cancelled = await client.request(jsonRequest('PATCH', `/api/enrollment-requests/${created.id}/status`, { status: 'cancelled', changedBy: 'reviewer@example.org' }));
		expect(cancelled.status).toBe(200);
		expect(((await cancelled.json()) as EnrollmentRequestResponse).statusHistory).toHaveLength(3);
	});

	it('returns 409 for an invalid status transition and 400 when rejection has no reason', async () => {
		const client = app();
		const createdResponse = await client.request(
			jsonRequest('POST', '/api/enrollment-requests', {
				courseId: 'course-001',
				learnerEmail: 'errors@example.org',
				justification: VALID_JUSTIFICATION,
			}),
		);
		const created = (await createdResponse.json()) as EnrollmentRequestResponse;

		const missingReason = await client.request(jsonRequest('PATCH', `/api/enrollment-requests/${created.id}/status`, { status: 'rejected', changedBy: 'reviewer@example.org' }));
		expect(missingReason.status).toBe(400);
		expect(((await missingReason.json()) as CourseErrorResponse).error.code).toBe('INVALID_REQUEST');

		await client.request(jsonRequest('PATCH', `/api/enrollment-requests/${created.id}/status`, { status: 'approved', changedBy: 'reviewer@example.org' }));
		const invalid = await client.request(jsonRequest('PATCH', `/api/enrollment-requests/${created.id}/status`, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Too late.' }));
		expect(invalid.status).toBe(409);
		expect(((await invalid.json()) as CourseErrorResponse).error.code).toBe('INVALID_STATUS_TRANSITION');
	});

	it('returns 404 for an unknown enrollment request', async () => {
		const response = await app().request('/api/enrollment-requests/enroll-999');
		expect(response.status).toBe(404);
		const body = (await response.json()) as CourseErrorResponse;
		expect(body.error.code).toBe('ENROLLMENT_REQUEST_NOT_FOUND');
	});
});

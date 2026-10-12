import { buildApplicationServicesFactory } from '@axc/application-services';
import {
	type Course,
	type CourseRepository,
	type CourseSearchCriteria,
	type EnrollmentRequest,
	type EnrollmentRequestFilters,
	type EnrollmentRequestRepository,
	isActiveEnrollmentStatus,
	normalizeEmail,
	searchCourseCollection,
} from '@axc/domain';
import type { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

/**
 * The REST suite owns its catalog so route behaviour never depends on the shipped seed data.
 * Repositories are array-backed test doubles for the `@axc/domain` ports; every rule they apply
 * comes from the domain itself, so the suite exercises the real services end to end over HTTP.
 */
const CATALOG: readonly Course[] = [
	{
		id: 'course-001',
		title: 'AI Security Foundations',
		summary: 'Secure AI development.',
		modality: 'online',
		status: 'active',
		tags: ['ai', 'security'],
		createdAt: '2026-01-15T00:00:00.000Z',
		updatedAt: '2026-06-01T00:00:00.000Z',
	},
	{ id: 'course-002', title: 'Baking Bread', summary: 'Sourdough fundamentals.', modality: 'in-person', status: 'active', tags: ['food'], createdAt: '2026-02-15T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z' },
	{
		id: 'course-003',
		title: 'Cloud Security Operations',
		summary: 'Detection and response.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['security', 'cloud'],
		createdAt: '2026-03-15T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
	},
	{ id: 'course-004', title: 'Data Modelling', summary: 'Document database schemas.', modality: 'online', status: 'retired', tags: ['data'], createdAt: '2026-04-15T00:00:00.000Z', updatedAt: '2026-04-20T00:00:00.000Z' },
];

const LEARNER = 'learner@example.org';
const JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';
const REVIEWER = 'reviewer@example.org';

function testCourseRepository(): CourseRepository {
	return {
		search: (criteria: CourseSearchCriteria) => Promise.resolve(searchCourseCollection(CATALOG, criteria)),
		findById: (courseId: string) => Promise.resolve(CATALOG.find((course) => course.id === courseId)),
	};
}

function testEnrollmentRequestRepository(): EnrollmentRequestRepository {
	const store = new Map<string, EnrollmentRequest>();
	let sequence = 0;

	const matches = (request: EnrollmentRequest, filters: EnrollmentRequestFilters): boolean =>
		(filters.status === undefined || request.status === filters.status) &&
		(filters.courseId === undefined || request.courseId === filters.courseId) &&
		(filters.learnerEmail === undefined || normalizeEmail(request.learnerEmail) === filters.learnerEmail);

	return {
		nextIdentity: () => {
			sequence += 1;
			return Promise.resolve(`enroll-${String(sequence).padStart(3, '0')}`);
		},
		save: (request: EnrollmentRequest) => {
			store.set(request.id, request);
			return Promise.resolve(request);
		},
		findById: (id: string) => Promise.resolve(store.get(id)),
		findByFilters: (filters: EnrollmentRequestFilters) => Promise.resolve([...store.values()].filter((request) => matches(request, filters)).reverse()),
		findActiveForLearner: (courseId: string, learnerEmail: string) =>
			Promise.resolve([...store.values()].find((request) => request.courseId === courseId && normalizeEmail(request.learnerEmail) === normalizeEmail(learnerEmail) && isActiveEnrollmentStatus(request.status))),
	};
}

let app: Hono;

beforeEach(() => {
	app = createRestApp(
		buildApplicationServicesFactory({
			environment: 'test',
			dataSources: { courses: testCourseRepository(), enrollmentRequests: testEnrollmentRequestRepository() },
		}),
	);
});

const get = (path: string) => app.request(path);

const postJson = (path: string, body: unknown) => app.request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const patchJson = (path: string, body: unknown) => app.request(path, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const createRequest = async (overrides: Record<string, unknown> = {}): Promise<EnrollmentRequest> => {
	const response = await postJson('/api/enrollment-requests', { courseId: 'course-001', learnerEmail: LEARNER, justification: JUSTIFICATION, ...overrides });
	expect(response.status).toBe(201);
	return (await response.json()) as EnrollmentRequest;
};

interface ErrorBody {
	error: { code: string; message: string; details: { field: string; message: string }[] };
}

const errorBody = async (response: Response): Promise<ErrorBody> => (await response.json()) as ErrorBody;

describe('GET /health', () => {
	it('still serves the healthcheck contract', async () => {
		const response = await get('/health');

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ status: 'ok', service: 'agentCourses-api', projectCode: 'axc', environment: 'test' });
	});
});

describe('GET /api/courses', () => {
	it('returns the catalog with default pagination', async () => {
		const response = await get('/api/courses');

		expect(response.status).toBe(200);
		expect(await response.json()).toStrictEqual({ items: [CATALOG[0], CATALOG[1], CATALOG[2], CATALOG[3]], page: 1, pageSize: 10, totalItems: 4, totalPages: 1 });
	});

	it('matches the keyword case-insensitively across title, summary, and tags', async () => {
		const body = (await (await get('/api/courses?q=SECURITY')).json()) as { items: Course[] };

		expect(body.items.map((course) => course.id)).toStrictEqual(['course-001', 'course-003']);
	});

	it.each([
		['modality=online', ['course-001', 'course-004']],
		['status=active', ['course-001', 'course-002']],
		['tag=AI', ['course-001']],
	])('filters on %s', async (query, expected) => {
		const body = (await (await get(`/api/courses?${query}`)).json()) as { items: Course[] };

		expect(body.items.map((course) => course.id)).toStrictEqual(expected);
	});

	it('combines keyword, modality, and status filters', async () => {
		const body = (await (await get('/api/courses?q=security&modality=online&status=active')).json()) as { items: Course[]; totalItems: number };

		expect(body.items.map((course) => course.id)).toStrictEqual(['course-001']);
		expect(body.totalItems).toBe(1);
	});

	it('paginates and reports page metadata', async () => {
		const body = (await (await get('/api/courses?page=2&pageSize=2')).json()) as { items: Course[]; page: number; pageSize: number; totalPages: number };

		expect(body.items.map((course) => course.id)).toStrictEqual(['course-003', 'course-004']);
		expect(body).toMatchObject({ page: 2, pageSize: 2, totalPages: 2 });
	});

	it('sorts by createdAt', async () => {
		const body = (await (await get('/api/courses?sort=createdAt')).json()) as { items: Course[] };

		expect(body.items.map((course) => course.createdAt)).toStrictEqual([...body.items.map((course) => course.createdAt)].sort());
	});

	it('returns an empty page rather than an error when nothing matches', async () => {
		const response = await get('/api/courses?q=underwater-basket-weaving');

		expect(response.status).toBe(200);
		expect(await response.json()).toStrictEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	it.each(['modality=remote', 'status=archived', 'sort=summary', 'page=0', 'pageSize=51', 'pageSize=abc'])('returns 400 for %s', async (query) => {
		const response = await get(`/api/courses?${query}`);

		expect(response.status).toBe(400);
		const body = await errorBody(response);
		expect(body.error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(body.error.details.length).toBeGreaterThan(0);
	});
});

describe('POST /api/enrollment-requests', () => {
	it('creates a pending request with its opening audit entry', async () => {
		const response = await postJson('/api/enrollment-requests', { courseId: 'course-001', learnerEmail: LEARNER, justification: JUSTIFICATION });

		expect(response.status).toBe(201);
		const created = (await response.json()) as EnrollmentRequest;
		expect(created).toMatchObject({ id: 'enroll-001', courseId: 'course-001', learnerEmail: LEARNER, justification: JUSTIFICATION, status: 'pending' });
		expect(created.statusHistory).toStrictEqual([{ fromStatus: null, toStatus: 'pending', changedAt: created.createdAt, changedBy: 'system', reason: null }]);
	});

	it('returns 404 COURSE_NOT_FOUND for a course that does not exist', async () => {
		const response = await postJson('/api/enrollment-requests', { courseId: 'course-404', learnerEmail: LEARNER, justification: JUSTIFICATION });

		expect(response.status).toBe(404);
		expect((await errorBody(response)).error.code).toBe('COURSE_NOT_FOUND');
	});

	it.each([
		['draft', 'course-003'],
		['retired', 'course-004'],
	])('returns 409 COURSE_NOT_ACTIVE for a %s course', async (_status, courseId) => {
		const response = await postJson('/api/enrollment-requests', { courseId, learnerEmail: LEARNER, justification: JUSTIFICATION });

		expect(response.status).toBe(409);
		expect((await errorBody(response)).error.code).toBe('COURSE_NOT_ACTIVE');
	});

	it.each([
		['an invalid learner email', { learnerEmail: 'not-an-email' }, 'learnerEmail'],
		['a justification that is too short', { justification: 'too short' }, 'justification'],
		['a justification that is too long', { justification: 'a'.repeat(501) }, 'justification'],
		['a missing courseId', { courseId: undefined }, 'courseId'],
	])('returns 400 INVALID_REQUEST for %s', async (_label, overrides, field) => {
		const response = await postJson('/api/enrollment-requests', { courseId: 'course-001', learnerEmail: LEARNER, justification: JUSTIFICATION, ...overrides });

		expect(response.status).toBe(400);
		const body = await errorBody(response);
		expect(body.error.code).toBe('INVALID_REQUEST');
		expect(body.error.details.map((detail) => detail.field)).toContain(field);
	});

	it('returns 400 INVALID_REQUEST for a malformed JSON body', async () => {
		const response = await app.request('/api/enrollment-requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{ not json' });

		expect(response.status).toBe(400);
		expect((await errorBody(response)).error.code).toBe('INVALID_REQUEST');
	});

	it('returns 409 DUPLICATE_ACTIVE_REQUEST for a second pending request', async () => {
		await createRequest();

		const response = await postJson('/api/enrollment-requests', { courseId: 'course-001', learnerEmail: LEARNER, justification: JUSTIFICATION });

		expect(response.status).toBe(409);
		expect((await errorBody(response)).error.code).toBe('DUPLICATE_ACTIVE_REQUEST');
	});

	it('returns 409 DUPLICATE_ACTIVE_REQUEST when the existing request is approved', async () => {
		const created = await createRequest();
		await patchJson(`/api/enrollment-requests/${created.id}/status`, { status: 'approved', changedBy: REVIEWER });

		const response = await postJson('/api/enrollment-requests', { courseId: 'course-001', learnerEmail: LEARNER, justification: JUSTIFICATION });

		expect(response.status).toBe(409);
		expect((await errorBody(response)).error.code).toBe('DUPLICATE_ACTIVE_REQUEST');
	});

	it('allows a new request once the previous one is cancelled', async () => {
		const created = await createRequest();
		await patchJson(`/api/enrollment-requests/${created.id}/status`, { status: 'cancelled', changedBy: LEARNER });

		const response = await postJson('/api/enrollment-requests', { courseId: 'course-001', learnerEmail: LEARNER, justification: JUSTIFICATION });

		expect(response.status).toBe(201);
	});
});

describe('GET /api/enrollment-requests/:id', () => {
	it('returns the request including its status history', async () => {
		const created = await createRequest();

		const response = await get(`/api/enrollment-requests/${created.id}`);

		expect(response.status).toBe(200);
		expect(await response.json()).toStrictEqual(created);
	});

	it('returns 404 ENROLLMENT_REQUEST_NOT_FOUND for an unknown id', async () => {
		const response = await get('/api/enrollment-requests/enroll-404');

		expect(response.status).toBe(404);
		expect((await errorBody(response)).error.code).toBe('ENROLLMENT_REQUEST_NOT_FOUND');
	});
});

describe('GET /api/enrollment-requests', () => {
	beforeEach(async () => {
		await createRequest();
		await createRequest({ courseId: 'course-002', learnerEmail: 'other@example.org' });
		const third = await createRequest({ courseId: 'course-002' });
		await patchJson(`/api/enrollment-requests/${third.id}/status`, { status: 'approved', changedBy: REVIEWER });
	});

	const listed = async (query: string): Promise<string[]> => {
		const response = await get(`/api/enrollment-requests${query}`);
		expect(response.status).toBe(200);
		const body = (await response.json()) as { items: EnrollmentRequest[]; totalItems: number };
		expect(body.totalItems).toBe(body.items.length);
		return body.items.map((request) => request.id);
	};

	it('returns every request, most recently created first', async () => {
		await expect(listed('')).resolves.toStrictEqual(['enroll-003', 'enroll-002', 'enroll-001']);
	});

	it('filters by status', async () => {
		await expect(listed('?status=approved')).resolves.toStrictEqual(['enroll-003']);
		await expect(listed('?status=pending')).resolves.toStrictEqual(['enroll-002', 'enroll-001']);
	});

	it('filters by courseId', async () => {
		await expect(listed('?courseId=course-002')).resolves.toStrictEqual(['enroll-003', 'enroll-002']);
	});

	it('filters by learnerEmail, ignoring casing', async () => {
		await expect(listed('?learnerEmail=OTHER%40example.org')).resolves.toStrictEqual(['enroll-002']);
	});

	it('combines every filter', async () => {
		await expect(listed(`?status=approved&courseId=course-002&learnerEmail=${encodeURIComponent(LEARNER)}`)).resolves.toStrictEqual(['enroll-003']);
	});

	it('returns an empty list when nothing matches', async () => {
		await expect(listed('?learnerEmail=nobody%40example.org')).resolves.toStrictEqual([]);
	});

	it('returns 400 for an unknown status filter', async () => {
		const response = await get('/api/enrollment-requests?status=archived');

		expect(response.status).toBe(400);
		expect((await errorBody(response)).error.code).toBe('INVALID_QUERY_PARAMETER');
	});
});

describe('PATCH /api/enrollment-requests/:id/status', () => {
	it.each([
		['approved', { status: 'approved', changedBy: REVIEWER }],
		['rejected', { status: 'rejected', changedBy: REVIEWER, reason: 'Learner has not completed the prerequisite course.' }],
		['cancelled', { status: 'cancelled', changedBy: LEARNER }],
	])('moves a pending request to %s and appends an audit entry', async (status, body) => {
		const created = await createRequest();

		const response = await patchJson(`/api/enrollment-requests/${created.id}/status`, body);

		expect(response.status).toBe(200);
		const updated = (await response.json()) as EnrollmentRequest;
		expect(updated.status).toBe(status);
		expect(updated.statusHistory).toHaveLength(2);
		expect(updated.statusHistory.at(-1)).toMatchObject({ fromStatus: 'pending', toStatus: status });
	});

	it('moves an approved request to cancelled and keeps the full audit trail', async () => {
		const created = await createRequest();
		await patchJson(`/api/enrollment-requests/${created.id}/status`, { status: 'approved', changedBy: REVIEWER });

		const response = await patchJson(`/api/enrollment-requests/${created.id}/status`, { status: 'cancelled', changedBy: LEARNER });

		expect(response.status).toBe(200);
		const updated = (await response.json()) as EnrollmentRequest;
		expect(updated.statusHistory.map((entry) => entry.toStatus)).toStrictEqual(['pending', 'approved', 'cancelled']);
	});

	it('persists the change so a later read sees it', async () => {
		const created = await createRequest();
		await patchJson(`/api/enrollment-requests/${created.id}/status`, { status: 'approved', changedBy: REVIEWER });

		expect(await (await get(`/api/enrollment-requests/${created.id}`)).json()).toMatchObject({ status: 'approved' });
	});

	it.each([
		['approved', 'rejected'],
		['rejected', 'approved'],
		['cancelled', 'approved'],
		['pending', 'pending'],
	])('returns 409 INVALID_STATUS_TRANSITION for %s -> %s', async (from, to) => {
		const created = await createRequest();
		if (from !== 'pending') {
			await patchJson(`/api/enrollment-requests/${created.id}/status`, { status: from, changedBy: REVIEWER, reason: 'Initial move.' });
		}

		const response = await patchJson(`/api/enrollment-requests/${created.id}/status`, { status: to, changedBy: REVIEWER, reason: 'Follow-up move.' });

		expect(response.status).toBe(409);
		expect((await errorBody(response)).error.code).toBe('INVALID_STATUS_TRANSITION');
	});

	it('returns 400 when rejecting without a reason', async () => {
		const created = await createRequest();

		const response = await patchJson(`/api/enrollment-requests/${created.id}/status`, { status: 'rejected', changedBy: REVIEWER });

		expect(response.status).toBe(400);
		const body = await errorBody(response);
		expect(body.error.code).toBe('INVALID_REQUEST');
		expect(body.error.details.map((detail) => detail.field)).toContain('reason');
	});

	it('returns 400 for an unknown status value', async () => {
		const created = await createRequest();

		const response = await patchJson(`/api/enrollment-requests/${created.id}/status`, { status: 'archived', changedBy: REVIEWER });

		expect(response.status).toBe(400);
		expect((await errorBody(response)).error.code).toBe('INVALID_REQUEST');
	});

	it('returns 404 for an unknown request', async () => {
		const response = await patchJson('/api/enrollment-requests/enroll-404/status', { status: 'approved', changedBy: REVIEWER });

		expect(response.status).toBe(404);
		expect((await errorBody(response)).error.code).toBe('ENROLLMENT_REQUEST_NOT_FOUND');
	});
});

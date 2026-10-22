import { COURSE_FIXTURES } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { ApplicationError, type ApplicationErrorCode } from './errors.ts';
import { buildApplicationServicesFactory } from './index.ts';

const JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';

function services() {
	return buildApplicationServicesFactory({ environment: 'test' }).forRequest();
}

function expectError(run: () => unknown, code: ApplicationErrorCode, field: string): void {
	try {
		run();
		expect.fail(`expected ${code}`);
	} catch (error) {
		expect(error).toBeInstanceOf(ApplicationError);
		if (error instanceof ApplicationError) {
			expect(error.code).toBe(code);
			expect(error.details.some((detail) => detail.field === field)).toBe(true);
		}
	}
}

describe('course search', () => {
	it('seeds a mixed catalog and returns the default page sorted by title', async () => {
		expect(COURSE_FIXTURES.length).toBeGreaterThanOrEqual(12);
		expect(new Set(COURSE_FIXTURES.map((course) => course.modality))).toEqual(new Set(['online', 'in-person', 'hybrid']));
		expect(new Set(COURSE_FIXTURES.map((course) => course.status))).toEqual(new Set(['draft', 'active', 'retired']));

		const api = await services();
		const result = api.courses.search({});

		expect(result).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(result.items.map((course) => course.id)).toEqual(['course-007', 'course-001', 'course-012', 'course-006', 'course-009', 'course-004', 'course-003', 'course-010', 'course-005', 'course-011']);
	});

	it('matches q case-insensitively across title, summary, and tags', async () => {
		const api = await services();

		expect(ids(api.courses.search({ q: 'SeCuRiTy' }))).toEqual(['course-001', 'course-006', 'course-011', 'course-002']);
		expect(ids(api.courses.search({ q: 'practicum' }))).toEqual(['course-003']);
		expect(ids(api.courses.search({ q: 'threat modeling' }))).toEqual(['course-011']);
		expect(ids(api.courses.search({ q: 'catalog-sample' }))).toEqual(['course-012']);
	});

	it('filters by modality, status, and tag', async () => {
		const api = await services();

		expect(ids(api.courses.search({ modality: 'online' }))).toEqual(['course-001', 'course-006', 'course-009', 'course-004', 'course-011']);
		expect(ids(api.courses.search({ status: 'active' }))).toEqual(['course-001', 'course-006', 'course-003', 'course-010', 'course-011', 'course-002', 'course-008']);
		expect(ids(api.courses.search({ tag: 'AI' }))).toEqual(['course-001', 'course-012']);
	});

	it('combines keyword, modality, and status filters', async () => {
		const api = await services();
		const result = api.courses.search({ q: 'security', modality: 'online', status: 'active', tag: 'ai', page: '1', pageSize: '5', sort: 'title' });

		expect(result).toMatchObject({ page: 1, pageSize: 5, totalItems: 1, totalPages: 1 });
		expect(result.items).toEqual([
			{
				id: 'course-001',
				title: 'AI Security Foundations',
				summary: 'Introductory course on secure AI-assisted development.',
				modality: 'online',
				status: 'active',
				tags: ['ai', 'security'],
				createdAt: '2026-01-15T00:00:00.000Z',
				updatedAt: '2026-06-01T00:00:00.000Z',
			},
		]);
	});

	it('paginates and sorts by createdAt', async () => {
		const api = await services();
		const page = api.courses.search({ page: '2', pageSize: '5' });
		expect(page.items).toHaveLength(5);
		expect(page).toMatchObject({ page: 2, pageSize: 5, totalItems: 12, totalPages: 3 });

		expect(ids(api.courses.search({ sort: 'createdAt' }))).toEqual(['course-012', 'course-005', 'course-009', 'course-004', 'course-001', 'course-002', 'course-007', 'course-003', 'course-010', 'course-006']);
		expect(ids(api.courses.search({ sort: 'updatedAt', page: '1', pageSize: '1' }))).toEqual(['course-012']);
	});

	it('returns an empty page when nothing matches', async () => {
		const api = await services();
		expect(api.courses.search({ q: 'zzzz-not-a-course' })).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	it('rejects invalid query parameters', async () => {
		const api = await services();
		expectError(() => api.courses.search({ modality: 'classroom' }), 'INVALID_QUERY_PARAMETER', 'modality');
		expectError(() => api.courses.search({ status: 'open' }), 'INVALID_QUERY_PARAMETER', 'status');
		expectError(() => api.courses.search({ page: '0' }), 'INVALID_QUERY_PARAMETER', 'page');
		expectError(() => api.courses.search({ pageSize: '51' }), 'INVALID_QUERY_PARAMETER', 'pageSize');
		expectError(() => api.courses.search({ sort: 'name' }), 'INVALID_QUERY_PARAMETER', 'sort');
		expectError(() => api.courses.search({ tag: ' ' }), 'INVALID_QUERY_PARAMETER', 'tag');

		try {
			api.courses.search({ modality: 'nope', pageSize: '0', sort: 'name' });
			expect.fail('expected invalid query');
		} catch (error) {
			expect(error).toBeInstanceOf(ApplicationError);
			if (error instanceof ApplicationError) {
				expect(error.details.map((detail) => detail.field)).toEqual(['pageSize', 'sort', 'modality']);
			}
		}
	});
});

describe('enrollment requests', () => {
	it('creates a pending request and records the initial history entry', async () => {
		const api = await services();
		const created = api.enrollmentRequests.create({
			courseId: 'course-001',
			learnerEmail: 'Learner@Example.org',
			justification: JUSTIFICATION,
		});

		expect(created).toMatchObject({
			id: 'enroll-001',
			courseId: 'course-001',
			learnerEmail: 'learner@example.org',
			justification: JUSTIFICATION,
			status: 'pending',
		});
		expect(created.createdAt).toBe(created.updatedAt);
		expect(created.statusHistory).toEqual([
			{
				fromStatus: null,
				toStatus: 'pending',
				changedAt: created.createdAt,
				changedBy: 'system',
				reason: null,
			},
		]);
		expect(api.enrollmentRequests.getById(created.id)).toEqual(created);
	});

	it('rejects a missing, draft, or retired course', async () => {
		const api = await services();
		expectError(() => api.enrollmentRequests.create(requestFor('course-999')), 'COURSE_NOT_FOUND', 'courseId');
		expectError(() => api.enrollmentRequests.create(requestFor('course-004')), 'COURSE_NOT_ACTIVE', 'courseId');
		expectError(() => api.enrollmentRequests.create(requestFor('course-005')), 'COURSE_NOT_ACTIVE', 'courseId');
	});

	it('rejects an invalid email and a short or long justification', async () => {
		const api = await services();
		expectError(() => api.enrollmentRequests.create({ courseId: 'course-001', learnerEmail: 'not-an-email', justification: JUSTIFICATION }), 'INVALID_REQUEST', 'learnerEmail');
		expectError(() => api.enrollmentRequests.create({ courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'x'.repeat(19) }), 'INVALID_REQUEST', 'justification');
		expectError(() => api.enrollmentRequests.create({ courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'x'.repeat(501) }), 'INVALID_REQUEST', 'justification');
		expect(api.enrollmentRequests.create({ courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'x'.repeat(20) }).status).toBe('pending');
		expect(api.enrollmentRequests.create({ courseId: 'course-002', learnerEmail: 'learner@example.org', justification: 'x'.repeat(500) }).status).toBe('pending');
	});

	it('blocks a second pending or approved request and allows a new one after rejection or cancellation', async () => {
		const api = await services();
		const pending = api.enrollmentRequests.create(requestFor('course-001'));
		expectError(() => api.enrollmentRequests.create(requestFor('course-001', 'Learner@Example.org')), 'DUPLICATE_ACTIVE_REQUEST', 'learnerEmail');

		const approved = api.enrollmentRequests.create(requestFor('course-002'));
		api.enrollmentRequests.updateStatus(approved.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		expectError(() => api.enrollmentRequests.create(requestFor('course-002')), 'DUPLICATE_ACTIVE_REQUEST', 'learnerEmail');

		api.enrollmentRequests.updateStatus(pending.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Learner has not completed the prerequisite course.' });
		expect(api.enrollmentRequests.create(requestFor('course-001')).status).toBe('pending');

		api.enrollmentRequests.updateStatus(approved.id, { status: 'cancelled', changedBy: 'reviewer@example.org' });
		expect(api.enrollmentRequests.create(requestFor('course-002')).id).not.toBe(approved.id);
	});

	it('filters by status, courseId, and learnerEmail', async () => {
		const api = await services();
		api.enrollmentRequests.create(requestFor('course-001', 'a@example.org'));
		api.enrollmentRequests.create(requestFor('course-002', 'a@example.org'));
		const third = api.enrollmentRequests.create(requestFor('course-001', 'b@example.org'));
		api.enrollmentRequests.updateStatus(third.id, { status: 'approved', changedBy: 'reviewer@example.org' });

		expect(api.enrollmentRequests.list({ status: 'pending' }).items.map((request) => request.learnerEmail)).toEqual(['a@example.org', 'a@example.org']);
		expect(api.enrollmentRequests.list({ courseId: 'course-001' }).items.map((request) => request.id)).toEqual(['enroll-001', third.id]);
		expect(api.enrollmentRequests.list({ learnerEmail: 'A@Example.org' }).items).toHaveLength(2);
		expect(api.enrollmentRequests.list({ status: 'approved', courseId: 'course-001', learnerEmail: 'b@example.org' }).items.map((request) => request.id)).toEqual([third.id]);
		expectError(() => api.enrollmentRequests.list({ status: 'nope' }), 'INVALID_REQUEST', 'status');
	});

	it('applies valid transitions and appends a history entry for each change', async () => {
		const api = await services();
		const created = api.enrollmentRequests.create(requestFor('course-001'));
		const approved = api.enrollmentRequests.updateStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		const cancelled = api.enrollmentRequests.updateStatus(created.id, { status: 'cancelled', changedBy: 'reviewer@example.org', reason: 'Learner withdrew.' });

		expect(approved.status).toBe('approved');
		expect(cancelled.status).toBe('cancelled');
		expect(cancelled.createdAt).toBe(created.createdAt);
		expect(cancelled.statusHistory.map((entry) => entry.toStatus)).toEqual(['pending', 'approved', 'cancelled']);
		expect(cancelled.statusHistory[2]).toMatchObject({ fromStatus: 'approved', toStatus: 'cancelled', changedBy: 'reviewer@example.org', reason: 'Learner withdrew.' });

		const rejectedSource = api.enrollmentRequests.create(requestFor('course-002'));
		const rejected = api.enrollmentRequests.updateStatus(rejectedSource.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Prerequisite missing.' });
		expect(rejected.statusHistory.map((entry) => entry.toStatus)).toEqual(['pending', 'rejected']);

		const directCancel = api.enrollmentRequests.create(requestFor('course-003'));
		expect(api.enrollmentRequests.updateStatus(directCancel.id, { status: 'cancelled', changedBy: 'reviewer@example.org' }).status).toBe('cancelled');
	});

	it('rejects invalid transitions, missing rejection reasons, and unknown requests', async () => {
		const api = await services();
		const created = api.enrollmentRequests.create(requestFor('course-001'));
		expectError(() => api.enrollmentRequests.updateStatus(created.id, { status: 'approved' }), 'INVALID_REQUEST', 'changedBy');
		expectError(() => api.enrollmentRequests.updateStatus(created.id, { status: 'nope', changedBy: 'reviewer@example.org' }), 'INVALID_REQUEST', 'status');
		expectError(() => api.enrollmentRequests.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org' }), 'INVALID_REQUEST', 'reason');
		expectError(() => api.enrollmentRequests.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: '   ' }), 'INVALID_REQUEST', 'reason');
		expectError(() => api.enrollmentRequests.updateStatus('enroll-missing', { status: 'approved', changedBy: 'reviewer@example.org' }), 'ENROLLMENT_REQUEST_NOT_FOUND', 'id');

		api.enrollmentRequests.updateStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		expectError(() => api.enrollmentRequests.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Too late.' }), 'INVALID_STATUS_TRANSITION', 'status');
		expectError(() => api.enrollmentRequests.updateStatus(created.id, { status: 'pending', changedBy: 'reviewer@example.org' }), 'INVALID_STATUS_TRANSITION', 'status');
	});
});

function requestFor(courseId: string, learnerEmail = 'learner@example.org') {
	return { courseId, learnerEmail, justification: JUSTIFICATION };
}

function ids(result: { items: Array<{ id: string }> }): string[] {
	return result.items.map((item) => item.id);
}

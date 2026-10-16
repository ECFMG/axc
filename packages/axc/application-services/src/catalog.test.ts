import { describe, expect, it } from 'vitest';
import { CatalogService } from './catalog.ts';

const reason = 'I need this course to prepare for secure development work.';
const input = (courseId = 'course-001', learnerEmail = 'Learner@Example.org') => ({ courseId, learnerEmail, justification: reason });
const query = (value = '') => new URLSearchParams(value);

function errorCode(action: () => unknown, code: string): void {
	const status = code === 'INVALID_REQUEST' || code === 'INVALID_QUERY_PARAMETER' ? 400 : code.endsWith('_NOT_FOUND') ? 404 : 409;
	expect(action).toThrowError(expect.objectContaining({ code, status }));
}

describe('course search', () => {
	const service = new CatalogService();
	it('returns the default page of a mixed 12-course fixture', () => {
		const result = service.searchCourses(query());
		expect(result).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(result.items).toHaveLength(10);
		expect(result.items[0]).toEqual(expect.objectContaining({ id: expect.any(String), createdAt: expect.any(String), updatedAt: expect.any(String) }));
	});
	it('searches title, summary, and tags without case sensitivity and combines filters', () => {
		expect(service.searchCourses(query('q=SECURITY')).items.length).toBeGreaterThan(0);
		expect(service.searchCourses(query('q=development')).items.length).toBeGreaterThan(0);
		expect(service.searchCourses(query('q=privacy')).items.length).toBeGreaterThan(0);
		const result = service.searchCourses(query('q=SECURITY&modality=online&status=active&tag=security'));
		expect(result.items.map((course) => course.id)).toEqual(['course-001', 'course-006']);
	});
	it('paginates, sorts, and returns empty pages', () => {
		expect(service.searchCourses(query('page=2&pageSize=5')).items).toHaveLength(5);
		const dates = service.searchCourses(query('sort=createdAt&pageSize=50')).items.map((course) => course.createdAt);
		expect(dates).toEqual([...dates].sort());
		expect(service.searchCourses(query('q=impossible')).items).toEqual([]);
	});
	it.each(['modality=remote', 'status=unknown', 'page=0', 'pageSize=51', 'sort=id', 'unknown=1', 'page=1&page=2'])('rejects invalid query %s', (value) => {
		errorCode(() => service.searchCourses(query(value)), 'INVALID_QUERY_PARAMETER');
	});
});

describe('enrollment requests', () => {
	it('creates, retrieves, and filters pending requests with an initial audit entry', () => {
		const service = new CatalogService();
		const created = service.createRequest(input());
		expect(created).toMatchObject({ courseId: 'course-001', learnerEmail: 'learner@example.org', status: 'pending' });
		expect(created.statusHistory).toEqual([{ fromStatus: null, toStatus: 'pending', changedAt: created.createdAt, changedBy: 'system', reason: null }]);
		expect(service.getRequest(created.id)).toEqual(created);
		expect(service.listRequests(query('status=pending&courseId=course-001&learnerEmail=LEARNER@example.org'))).toEqual([created]);
		expect(service.listRequests(query('status=approved'))).toEqual([]);
	});
	it('validates course and input', () => {
		const service = new CatalogService();
		errorCode(() => service.createRequest(input('missing')), 'COURSE_NOT_FOUND');
		errorCode(() => service.createRequest(input('course-004')), 'COURSE_NOT_ACTIVE');
		errorCode(() => service.createRequest(input('course-005')), 'COURSE_NOT_ACTIVE');
		errorCode(() => service.createRequest(input('course-001', 'invalid')), 'INVALID_REQUEST');
		errorCode(() => service.createRequest({ ...input(), justification: 'too short' }), 'INVALID_REQUEST');
		errorCode(() => service.createRequest({ ...input(), justification: 'x'.repeat(501) }), 'INVALID_REQUEST');
		errorCode(() => service.createRequest(null), 'INVALID_REQUEST');
	});
	it('blocks duplicate pending and approved requests regardless of email casing', () => {
		const service = new CatalogService();
		const created = service.createRequest(input());
		errorCode(() => service.createRequest(input('course-001', 'learner@example.org')), 'DUPLICATE_ACTIVE_REQUEST');
		service.changeStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		errorCode(() => service.createRequest(input()), 'DUPLICATE_ACTIVE_REQUEST');
		service.changeStatus(created.id, { status: 'cancelled', changedBy: 'reviewer@example.org' });
		expect(service.createRequest(input()).status).toBe('pending');
	});
	it.each(['approved', 'rejected', 'cancelled'] as const)('allows pending to %s', (status) => {
		const service = new CatalogService();
		const created = service.createRequest(input());
		const changed = service.changeStatus(created.id, { status, changedBy: 'reviewer@example.org', ...(status === 'rejected' ? { reason: 'Prerequisite incomplete.' } : {}) });
		expect(changed.status).toBe(status);
		expect(changed.statusHistory).toHaveLength(2);
		expect(changed.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: status, changedBy: 'reviewer@example.org' });
	});
	it('allows approved to cancelled and preserves all audit entries', () => {
		const service = new CatalogService();
		const id = service.createRequest(input()).id;
		service.changeStatus(id, { status: 'approved', changedBy: 'reviewer-1' });
		const result = service.changeStatus(id, { status: 'cancelled', changedBy: 'reviewer-2' });
		expect(result.statusHistory.map((entry) => entry.toStatus)).toEqual(['pending', 'approved', 'cancelled']);
		expect(result.statusHistory[2]?.fromStatus).toBe('approved');
	});
	it('rejects invalid transitions, missing reason, and missing request', () => {
		const service = new CatalogService();
		const id = service.createRequest(input()).id;
		errorCode(() => service.changeStatus(id, { status: 'rejected', changedBy: 'reviewer' }), 'INVALID_REQUEST');
		errorCode(() => service.changeStatus(id, { status: 'unknown', changedBy: 'reviewer' }), 'INVALID_REQUEST');
		errorCode(() => service.changeStatus(id, { status: 'pending', changedBy: 'reviewer' }), 'INVALID_STATUS_TRANSITION');
		errorCode(() => service.getRequest('missing'), 'ENROLLMENT_REQUEST_NOT_FOUND');
		service.changeStatus(id, { status: 'rejected', changedBy: 'reviewer', reason: 'Not eligible.' });
		errorCode(() => service.changeStatus(id, { status: 'approved', changedBy: 'reviewer' }), 'INVALID_STATUS_TRANSITION');
		expect(service.getRequest(id).statusHistory).toHaveLength(2);
	});
});

import { describe, expect, it } from 'vitest';
import { type Course, listCourses } from './courses.ts';
import { createEnrollmentRequestStore, EnrollmentRequestError } from './enrollment-requests.store.ts';

const firstByStatus = (status: 'draft' | 'active' | 'retired'): Course => {
	const result = listCourses({ page: 1, pageSize: 50, sort: 'title', status });
	const course = result.items[0];
	if (course === undefined) {
		throw new Error(`expected a ${status} course`);
	}
	return course;
};

const justification = 'I need this course to prepare for upcoming secure development work.';

describe('course search regression', () => {
	it('returns a paginated catalog with default paging fields', () => {
		const result = listCourses({ page: 1, pageSize: 10, sort: 'title' });
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.length).toBeLessThanOrEqual(10);
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
		expect(result.totalItems).toBeGreaterThan(0);
	});

	it('filters by modality and status together', () => {
		const result = listCourses({ page: 1, pageSize: 50, sort: 'title', modality: 'online', status: 'active' });
		expect(result.items.length).toBeGreaterThan(0);
		for (const course of result.items) {
			expect(course.modality).toBe('online');
			expect(course.status).toBe('active');
		}
	});
});

describe('enrollment requests', () => {
	it('creates a pending request with an initial status history entry', () => {
		const at = new Date('2026-06-27T10:00:00.000Z');
		const store = createEnrollmentRequestStore({ newId: () => 'enroll-create', now: () => at });
		const created = store.create({ courseId: firstByStatus('active').id, learnerEmail: 'create@example.org', justification });
		expect(created.status).toBe('pending');
		expect(created.id).toBe('enroll-create');
		expect(created.statusHistory).toHaveLength(1);
		const initial = created.statusHistory[0];
		expect(initial?.fromStatus).toBeNull();
		expect(initial?.toStatus).toBe('pending');
		expect(initial?.changedBy).toBe('system');
		expect(initial?.reason).toBeNull();
		expect(initial?.changedAt).toBe(at.toISOString());
	});

	it('rejects a missing course', () => {
		const store = createEnrollmentRequestStore();
		try {
			store.create({ courseId: 'course-missing-unit', learnerEmail: 'missing@example.org', justification });
			throw new Error('expected COURSE_NOT_FOUND');
		} catch (error) {
			expect(error).toBeInstanceOf(EnrollmentRequestError);
			if (error instanceof EnrollmentRequestError) {
				expect(error.code).toBe('COURSE_NOT_FOUND');
			}
		}
	});

	it('rejects draft and retired courses', () => {
		const store = createEnrollmentRequestStore();
		try {
			store.create({ courseId: firstByStatus('draft').id, learnerEmail: 'draft@example.org', justification });
			throw new Error('expected COURSE_NOT_ACTIVE');
		} catch (error) {
			expect(error).toBeInstanceOf(EnrollmentRequestError);
			if (error instanceof EnrollmentRequestError) {
				expect(error.code).toBe('COURSE_NOT_ACTIVE');
			}
		}
		try {
			store.create({ courseId: firstByStatus('retired').id, learnerEmail: 'retired@example.org', justification });
			throw new Error('expected COURSE_NOT_ACTIVE');
		} catch (error) {
			expect(error).toBeInstanceOf(EnrollmentRequestError);
			if (error instanceof EnrollmentRequestError) {
				expect(error.code).toBe('COURSE_NOT_ACTIVE');
			}
		}
	});

	it('rejects invalid email and short justification together', () => {
		const store = createEnrollmentRequestStore();
		try {
			store.create({ courseId: firstByStatus('active').id, learnerEmail: 'not-an-email', justification: 'too short' });
			throw new Error('expected INVALID_REQUEST');
		} catch (error) {
			expect(error).toBeInstanceOf(EnrollmentRequestError);
			if (error instanceof EnrollmentRequestError) {
				expect(error.code).toBe('INVALID_REQUEST');
				expect(error.details).toHaveLength(2);
			}
		}
	});

	it('accepts a 20-character justification and rejects 19 and 501', () => {
		const store = createEnrollmentRequestStore();
		const courseId = firstByStatus('active').id;
		const created = store.create({ courseId, learnerEmail: 'boundary@example.org', justification: '12345678901234567890' });
		expect(created.justification).toHaveLength(20);
		try {
			store.create({ courseId, learnerEmail: 'short@example.org', justification: '1234567890123456789' });
			throw new Error('expected INVALID_REQUEST');
		} catch (error) {
			expect(error).toBeInstanceOf(EnrollmentRequestError);
			if (error instanceof EnrollmentRequestError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
		try {
			store.create({ courseId, learnerEmail: 'long@example.org', justification: 'x'.repeat(501) });
			throw new Error('expected INVALID_REQUEST');
		} catch (error) {
			expect(error).toBeInstanceOf(EnrollmentRequestError);
			if (error instanceof EnrollmentRequestError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});

	it('prevents duplicate pending and approved requests for the same learner and course', () => {
		const store = createEnrollmentRequestStore();
		const courseId = firstByStatus('active').id;
		store.create({ courseId, learnerEmail: 'dup@example.org', justification });
		try {
			store.create({ courseId, learnerEmail: 'dup@example.org', justification });
			throw new Error('expected DUPLICATE_ACTIVE_REQUEST');
		} catch (error) {
			expect(error).toBeInstanceOf(EnrollmentRequestError);
			if (error instanceof EnrollmentRequestError) {
				expect(error.code).toBe('DUPLICATE_ACTIVE_REQUEST');
			}
		}
		const approvedStore = createEnrollmentRequestStore();
		const approved = approvedStore.create({ courseId, learnerEmail: 'dup-approved@example.org', justification });
		approvedStore.updateStatus(approved.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		try {
			approvedStore.create({ courseId, learnerEmail: 'dup-approved@example.org', justification });
			throw new Error('expected DUPLICATE_ACTIVE_REQUEST');
		} catch (error) {
			expect(error).toBeInstanceOf(EnrollmentRequestError);
			if (error instanceof EnrollmentRequestError) {
				expect(error.code).toBe('DUPLICATE_ACTIVE_REQUEST');
			}
		}
	});

	it('retrieves a request by id including status history', () => {
		const store = createEnrollmentRequestStore();
		const created = store.create({ courseId: firstByStatus('active').id, learnerEmail: 'get@example.org', justification });
		const loaded = store.getById(created.id);
		expect(loaded.id).toBe(created.id);
		expect(loaded.statusHistory.length).toBeGreaterThan(0);
	});

	it('filters by status, courseId, and learnerEmail', () => {
		const store = createEnrollmentRequestStore();
		const courseId = firstByStatus('active').id;
		store.create({ courseId, learnerEmail: 'filter-a@example.org', justification });
		store.create({ courseId, learnerEmail: 'filter-b@example.org', justification });
		const byEmail = store.list({ learnerEmail: 'filter-a@example.org' });
		expect(byEmail.length).toBeGreaterThan(0);
		for (const request of byEmail) {
			expect(request.learnerEmail.toLowerCase()).toBe('filter-a@example.org');
		}
		const byStatus = store.list({ status: 'pending' });
		expect(byStatus.length).toBeGreaterThan(0);
		for (const request of byStatus) {
			expect(request.status).toBe('pending');
		}
		const byCourse = store.list({ courseId });
		expect(byCourse.length).toBeGreaterThan(0);
		for (const request of byCourse) {
			expect(request.courseId).toBe(courseId);
		}
	});

	it('applies valid status transitions and appends history', () => {
		const store = createEnrollmentRequestStore();
		const courseId = firstByStatus('active').id;
		const pendingApproved = store.create({ courseId, learnerEmail: 't-approved@example.org', justification });
		const approved = store.updateStatus(pendingApproved.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		expect(approved.status).toBe('approved');
		expect(approved.statusHistory).toHaveLength(2);
		const pendingRejected = store.create({ courseId, learnerEmail: 't-rejected@example.org', justification });
		const rejected = store.updateStatus(pendingRejected.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Learner has not completed the prerequisite course.' });
		expect(rejected.status).toBe('rejected');
		const pendingCancelled = store.create({ courseId, learnerEmail: 't-cancelled@example.org', justification });
		expect(store.updateStatus(pendingCancelled.id, { status: 'cancelled', changedBy: 'reviewer@example.org' }).status).toBe('cancelled');
		const approvedCancelled = store.create({ courseId, learnerEmail: 't-approved-cancelled@example.org', justification });
		store.updateStatus(approvedCancelled.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		expect(store.updateStatus(approvedCancelled.id, { status: 'cancelled', changedBy: 'reviewer@example.org' }).status).toBe('cancelled');
		expect(store.getById(approvedCancelled.id).statusHistory).toHaveLength(3);
	});

	it('returns INVALID_STATUS_TRANSITION for an illegal change', () => {
		const store = createEnrollmentRequestStore();
		const created = store.create({ courseId: firstByStatus('active').id, learnerEmail: 'illegal@example.org', justification });
		store.updateStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		try {
			store.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'too late' });
			throw new Error('expected INVALID_STATUS_TRANSITION');
		} catch (error) {
			expect(error).toBeInstanceOf(EnrollmentRequestError);
			if (error instanceof EnrollmentRequestError) {
				expect(error.code).toBe('INVALID_STATUS_TRANSITION');
			}
		}
	});

	it('requires a non-empty reason when rejecting', () => {
		const store = createEnrollmentRequestStore();
		const created = store.create({ courseId: firstByStatus('active').id, learnerEmail: 'noreason@example.org', justification });
		try {
			store.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org' });
			throw new Error('expected INVALID_REQUEST');
		} catch (error) {
			expect(error).toBeInstanceOf(EnrollmentRequestError);
			if (error instanceof EnrollmentRequestError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});

	it('throws ENROLLMENT_REQUEST_NOT_FOUND for an unknown id', () => {
		const store = createEnrollmentRequestStore();
		try {
			store.getById('enroll-missing');
			throw new Error('expected ENROLLMENT_REQUEST_NOT_FOUND');
		} catch (error) {
			expect(error).toBeInstanceOf(EnrollmentRequestError);
			if (error instanceof EnrollmentRequestError) {
				expect(error.code).toBe('ENROLLMENT_REQUEST_NOT_FOUND');
			}
		}
	});
});

import { describe, expect, it } from 'vitest';
import { COURSE_CATALOG, InvalidQueryParameterError } from './courses.ts';
import { ApplicationError, createEnrollmentRequestService } from './enrollment-requests.ts';
import { buildApplicationServicesFactory } from './index.ts';

const VALID_JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';

function service() {
	return createEnrollmentRequestService();
}

function createPending(target = service(), courseId = 'course-001', learnerEmail = 'learner@example.org') {
	return target.create({
		courseId,
		learnerEmail,
		justification: VALID_JUSTIFICATION,
	});
}

describe('enrollment request workflow', () => {
	it('creates a pending enrollment request with an initial status history entry', () => {
		const created = createPending();

		expect(created.id).toBe('enroll-001');
		expect(created.courseId).toBe('course-001');
		expect(created.learnerEmail).toBe('learner@example.org');
		expect(created.justification).toBe(VALID_JUSTIFICATION);
		expect(created.status).toBe('pending');
		expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		expect(created.updatedAt).toBe(created.createdAt);
		expect(created.statusHistory).toHaveLength(1);
		expect(created.statusHistory[0]).toMatchObject({
			fromStatus: null,
			toStatus: 'pending',
			changedBy: 'system',
			reason: null,
		});
	});

	it('exposes create through the application services factory', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
		const created = services.enrollmentRequests.create({
			courseId: 'course-001',
			learnerEmail: 'factory@example.org',
			justification: VALID_JUSTIFICATION,
		});

		expect(created.status).toBe('pending');
		expect(services.enrollmentRequests.getById(created.id).id).toBe(created.id);
	});

	it('rejects a request for a missing course', () => {
		try {
			createPending(service(), 'course-missing');
			throw new Error('expected course not found');
		} catch (error) {
			expect(error).toBeInstanceOf(ApplicationError);
			if (error instanceof ApplicationError) {
				expect(error.code).toBe('COURSE_NOT_FOUND');
				expect(error.httpStatus).toBe(404);
			}
		}
	});

	it('rejects requests for draft or retired courses', () => {
		const draft = COURSE_CATALOG.find((course) => course.status === 'draft');
		const retired = COURSE_CATALOG.find((course) => course.status === 'retired');
		expect(draft).toBeDefined();
		expect(retired).toBeDefined();

		for (const course of [draft, retired]) {
			try {
				createPending(service(), course?.id);
				throw new Error(`expected inactive course rejection for ${course?.id}`);
			} catch (error) {
				expect(error).toBeInstanceOf(ApplicationError);
				if (error instanceof ApplicationError) {
					expect(error.code).toBe('COURSE_NOT_ACTIVE');
					expect(error.httpStatus).toBe(409);
				}
			}
		}
	});

	it('rejects invalid email and short justification', () => {
		try {
			service().create({
				courseId: 'course-001',
				learnerEmail: 'not-an-email',
				justification: 'too short',
			});
			throw new Error('expected validation failure');
		} catch (error) {
			expect(error).toBeInstanceOf(ApplicationError);
			if (error instanceof ApplicationError) {
				expect(error.code).toBe('INVALID_REQUEST');
				expect(error.httpStatus).toBe(400);
				expect(error.details.map((detail) => detail.field)).toStrictEqual(['learnerEmail', 'justification']);
			}
		}
	});

	it('rejects justification longer than 500 characters', () => {
		try {
			service().create({
				courseId: 'course-001',
				learnerEmail: 'learner@example.org',
				justification: 'a'.repeat(501),
			});
			throw new Error('expected justification length failure');
		} catch (error) {
			expect(error).toBeInstanceOf(ApplicationError);
			if (error instanceof ApplicationError) {
				expect(error.code).toBe('INVALID_REQUEST');
				expect(error.details.some((detail) => detail.field === 'justification')).toBe(true);
			}
		}
	});

	it('prevents a duplicate pending request for the same learner and course', () => {
		const target = service();
		createPending(target);

		try {
			createPending(target);
			throw new Error('expected duplicate pending request');
		} catch (error) {
			expect(error).toBeInstanceOf(ApplicationError);
			if (error instanceof ApplicationError) {
				expect(error.code).toBe('DUPLICATE_ACTIVE_REQUEST');
				expect(error.httpStatus).toBe(409);
			}
		}
	});

	it('prevents a duplicate approved request for the same learner and course', () => {
		const target = service();
		const created = createPending(target);
		target.updateStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' });

		try {
			createPending(target);
			throw new Error('expected duplicate approved request');
		} catch (error) {
			expect(error).toBeInstanceOf(ApplicationError);
			if (error instanceof ApplicationError) {
				expect(error.code).toBe('DUPLICATE_ACTIVE_REQUEST');
				expect(error.httpStatus).toBe(409);
			}
		}
	});

	it('allows a new request after the previous one is rejected or cancelled', () => {
		const target = service();
		const first = createPending(target, 'course-001', 'retry@example.org');
		target.updateStatus(first.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Learner has not completed the prerequisite course.' });
		const second = createPending(target, 'course-001', 'retry@example.org');
		expect(second.status).toBe('pending');

		target.updateStatus(second.id, { status: 'cancelled', changedBy: 'reviewer@example.org' });
		const third = createPending(target, 'course-001', 'retry@example.org');
		expect(third.status).toBe('pending');
	});

	it('retrieves a request by id including status history', () => {
		const target = service();
		const created = createPending(target);
		const fetched = target.getById(created.id);

		expect(fetched).toStrictEqual(created);
		expect(fetched.statusHistory[0]?.toStatus).toBe('pending');
	});

	it('returns not found for an unknown request id', () => {
		try {
			service().getById('enroll-999');
			throw new Error('expected missing request');
		} catch (error) {
			expect(error).toBeInstanceOf(ApplicationError);
			if (error instanceof ApplicationError) {
				expect(error.code).toBe('ENROLLMENT_REQUEST_NOT_FOUND');
				expect(error.httpStatus).toBe(404);
			}
		}
	});

	it('filters the list by status, courseId, and learnerEmail', () => {
		const target = service();
		createPending(target, 'course-001', 'alpha@example.org');
		createPending(target, 'course-002', 'alpha@example.org');
		const other = createPending(target, 'course-001', 'beta@example.org');
		target.updateStatus(other.id, { status: 'approved', changedBy: 'reviewer@example.org' });

		const byEmail = target.list({ learnerEmail: 'ALPHA@example.org' });
		expect(byEmail.items).toHaveLength(2);
		expect(byEmail.items.every((item) => item.learnerEmail === 'alpha@example.org')).toBe(true);

		const byCourse = target.list({ courseId: 'course-001' });
		expect(byCourse.items).toHaveLength(2);
		expect(byCourse.items.every((item) => item.courseId === 'course-001')).toBe(true);

		const byStatus = target.list({ status: 'approved' });
		expect(byStatus.items).toHaveLength(1);
		expect(byStatus.items[0]?.learnerEmail).toBe('beta@example.org');

		const combined = target.list({ status: 'pending', courseId: 'course-001', learnerEmail: 'alpha@example.org' });
		expect(combined.items).toHaveLength(1);
		expect(combined.items[0]?.courseId).toBe('course-001');
	});

	it('rejects an invalid list status filter', () => {
		try {
			service().list({ status: 'published' });
			throw new Error('expected invalid list status');
		} catch (error) {
			expect(error).toBeInstanceOf(InvalidQueryParameterError);
			if (error instanceof InvalidQueryParameterError) {
				expect(error.details.some((detail) => detail.field === 'status')).toBe(true);
			}
		}
	});

	it('supports pending to approved, rejected, and cancelled, and approved to cancelled', () => {
		const target = service();
		const approved = createPending(target, 'course-001', 'approve@example.org');
		const rejected = createPending(target, 'course-001', 'reject@example.org');
		const cancelled = createPending(target, 'course-001', 'cancel@example.org');
		const approvedThenCancelled = createPending(target, 'course-001', 'approved-cancel@example.org');

		expect(target.updateStatus(approved.id, { status: 'approved', changedBy: 'reviewer@example.org' }).status).toBe('approved');
		expect(target.updateStatus(rejected.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Learner has not completed the prerequisite course.' }).status).toBe('rejected');
		expect(target.updateStatus(cancelled.id, { status: 'cancelled', changedBy: 'reviewer@example.org' }).status).toBe('cancelled');
		target.updateStatus(approvedThenCancelled.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		expect(target.updateStatus(approvedThenCancelled.id, { status: 'cancelled', changedBy: 'reviewer@example.org' }).status).toBe('cancelled');
	});

	it('rejects an invalid status transition with 409', () => {
		const target = service();
		const created = createPending(target);
		target.updateStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' });

		try {
			target.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Too late to reject.' });
			throw new Error('expected invalid transition');
		} catch (error) {
			expect(error).toBeInstanceOf(ApplicationError);
			if (error instanceof ApplicationError) {
				expect(error.code).toBe('INVALID_STATUS_TRANSITION');
				expect(error.httpStatus).toBe(409);
			}
		}
	});

	it('rejects an invalid status value', () => {
		const target = service();
		const created = createPending(target);

		try {
			target.updateStatus(created.id, { status: 'published', changedBy: 'reviewer@example.org' });
			throw new Error('expected invalid status value');
		} catch (error) {
			expect(error).toBeInstanceOf(ApplicationError);
			if (error instanceof ApplicationError) {
				expect(error.code).toBe('INVALID_REQUEST');
				expect(error.httpStatus).toBe(400);
				expect(error.details.some((detail) => detail.field === 'status')).toBe(true);
			}
		}
	});

	it('requires a non-empty reason when rejecting', () => {
		const target = service();
		const created = createPending(target);

		try {
			target.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org' });
			throw new Error('expected rejection reason');
		} catch (error) {
			expect(error).toBeInstanceOf(ApplicationError);
			if (error instanceof ApplicationError) {
				expect(error.code).toBe('INVALID_REQUEST');
				expect(error.httpStatus).toBe(400);
				expect(error.details.some((detail) => detail.field === 'reason')).toBe(true);
			}
		}
	});

	it('appends a status history entry for every status change', () => {
		const target = service();
		const created = createPending(target);
		const approved = target.updateStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		const cancelled = target.updateStatus(created.id, { status: 'cancelled', changedBy: 'ops@example.org', reason: 'Learner withdrew.' });

		expect(cancelled.statusHistory).toHaveLength(3);
		expect(cancelled.statusHistory[0]).toMatchObject({ fromStatus: null, toStatus: 'pending', changedBy: 'system' });
		expect(cancelled.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'approved', changedBy: 'reviewer@example.org' });
		expect(cancelled.statusHistory[2]).toMatchObject({ fromStatus: 'approved', toStatus: 'cancelled', changedBy: 'ops@example.org', reason: 'Learner withdrew.' });
		expect(approved.statusHistory).toHaveLength(2);
	});
});

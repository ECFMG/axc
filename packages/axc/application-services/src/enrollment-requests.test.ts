import type { Course } from '@axc/domain';
import { createInMemoryCourseReadRepository, createInMemoryEnrollmentRequestRepository, seededCourses } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import {
	COURSE_NOT_ACTIVE_CODE,
	COURSE_NOT_FOUND_CODE,
	createEnrollmentRequestService,
	DUPLICATE_ACTIVE_REQUEST_CODE,
	ENROLLMENT_REQUEST_NOT_FOUND_CODE,
	INVALID_REQUEST_CODE,
	INVALID_STATUS_TRANSITION_CODE,
} from './enrollment-requests.ts';
import { buildApplicationServicesFactory, INVALID_QUERY_PARAMETER_CODE } from './index.ts';

const VALID_JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';

describe('enrollment request workflow', () => {
	it('creates a pending request with a creation history entry', () => {
		const service = enrollmentService();
		const result = service.create({
			courseId: 'course-001',
			learnerEmail: 'Learner@example.org',
			justification: VALID_JUSTIFICATION,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.value.id).toBe('enroll-001');
		expect(result.value.courseId).toBe('course-001');
		expect(result.value.learnerEmail).toBe('learner@example.org');
		expect(result.value.justification).toBe(VALID_JUSTIFICATION);
		expect(result.value.status).toBe('pending');
		expect(result.value.statusHistory).toHaveLength(1);
		expect(result.value.statusHistory[0]).toMatchObject({
			fromStatus: null,
			toStatus: 'pending',
			changedBy: 'system',
			reason: null,
		});
		expect(result.value.createdAt).toBe(result.value.updatedAt);
		expect(result.value.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('returns 404 when the course does not exist', () => {
		const result = enrollmentService().create({
			courseId: 'course-missing',
			learnerEmail: 'learner@example.org',
			justification: VALID_JUSTIFICATION,
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}

		expect(result.status).toBe(404);
		expect(result.error.code).toBe(COURSE_NOT_FOUND_CODE);
		expect(result.error.details.map((detail) => detail.field)).toEqual(['courseId']);
	});

	it('returns 409 when the course is draft or retired', () => {
		const draft = enrollmentService().create({
			courseId: 'course-003',
			learnerEmail: 'learner@example.org',
			justification: VALID_JUSTIFICATION,
		});
		const retired = enrollmentService().create({
			courseId: 'course-004',
			learnerEmail: 'learner@example.org',
			justification: VALID_JUSTIFICATION,
		});

		expect(draft.ok).toBe(false);
		expect(retired.ok).toBe(false);
		if (draft.ok || retired.ok) {
			return;
		}

		expect(draft.status).toBe(409);
		expect(draft.error.code).toBe(COURSE_NOT_ACTIVE_CODE);
		expect(retired.status).toBe(409);
		expect(retired.error.code).toBe(COURSE_NOT_ACTIVE_CODE);
	});

	it('returns 400 for invalid email and short or long justification', () => {
		const service = enrollmentService();
		const invalidEmail = service.create({
			courseId: 'course-001',
			learnerEmail: 'not-an-email',
			justification: VALID_JUSTIFICATION,
		});
		const shortJustification = service.create({
			courseId: 'course-001',
			learnerEmail: 'learner@example.org',
			justification: 'too short',
		});
		const longJustification = service.create({
			courseId: 'course-001',
			learnerEmail: 'learner@example.org',
			justification: 'x'.repeat(501),
		});

		expect(invalidEmail.ok).toBe(false);
		expect(shortJustification.ok).toBe(false);
		expect(longJustification.ok).toBe(false);
		if (invalidEmail.ok || shortJustification.ok || longJustification.ok) {
			return;
		}

		expect(invalidEmail.status).toBe(400);
		expect(invalidEmail.error.code).toBe(INVALID_REQUEST_CODE);
		expect(invalidEmail.error.details.map((detail) => detail.field)).toEqual(['learnerEmail']);
		expect(shortJustification.error.details.map((detail) => detail.field)).toEqual(['justification']);
		expect(longJustification.error.details.map((detail) => detail.field)).toEqual(['justification']);
	});

	it('prevents a duplicate pending request for the same learner and course', () => {
		const service = enrollmentService();
		const first = service.create(validCreate('dup-pending@example.org'));
		const second = service.create(validCreate('dup-pending@example.org'));

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(false);
		if (second.ok) {
			return;
		}

		expect(second.status).toBe(409);
		expect(second.error.code).toBe(DUPLICATE_ACTIVE_REQUEST_CODE);
	});

	it('prevents a duplicate request when an approved request already exists', () => {
		const service = enrollmentService();
		const created = requireOk(service.create(validCreate('dup-approved@example.org')));
		requireOk(service.updateStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' }));
		const duplicate = service.create(validCreate('dup-approved@example.org'));

		expect(duplicate.ok).toBe(false);
		if (duplicate.ok) {
			return;
		}

		expect(duplicate.status).toBe(409);
		expect(duplicate.error.code).toBe(DUPLICATE_ACTIVE_REQUEST_CODE);
	});

	it('allows a new request after the previous one is rejected', () => {
		const service = enrollmentService();
		const created = requireOk(service.create(validCreate('after-reject@example.org')));
		requireOk(
			service.updateStatus(created.id, {
				status: 'rejected',
				changedBy: 'reviewer@example.org',
				reason: 'Learner has not completed the prerequisite course.',
			}),
		);
		const again = service.create(validCreate('after-reject@example.org'));
		expect(again.ok).toBe(true);
	});

	it('retrieves a request by id including status history', () => {
		const service = enrollmentService();
		const created = requireOk(service.create(validCreate('get-by-id@example.org')));
		const fetched = service.getById(created.id);

		expect(fetched.ok).toBe(true);
		if (!fetched.ok) {
			return;
		}

		expect(fetched.value).toEqual(created);
		expect(fetched.value.statusHistory[0]?.toStatus).toBe('pending');
	});

	it('returns 404 when the request does not exist', () => {
		const missing = enrollmentService().getById('enroll-999');
		expect(missing.ok).toBe(false);
		if (missing.ok) {
			return;
		}

		expect(missing.status).toBe(404);
		expect(missing.error.code).toBe(ENROLLMENT_REQUEST_NOT_FOUND_CODE);
	});

	it('filters the list by status, courseId, and learnerEmail', () => {
		const service = enrollmentService();
		requireOk(service.create(validCreate('filter-one@example.org', 'course-001')));
		requireOk(service.create(validCreate('filter-two@example.org', 'course-002')));
		const approved = requireOk(service.create(validCreate('filter-three@example.org', 'course-001')));
		requireOk(service.updateStatus(approved.id, { status: 'approved', changedBy: 'reviewer@example.org' }));

		const byStatus = requireOk(service.list({ status: 'pending' }));
		const byCourse = requireOk(service.list({ courseId: 'course-002' }));
		const byEmail = requireOk(service.list({ learnerEmail: 'Filter-One@example.org' }));
		const combined = requireOk(service.list({ status: 'approved', courseId: 'course-001', learnerEmail: 'filter-three@example.org' }));

		expect(byStatus.items.every((item) => item.status === 'pending')).toBe(true);
		expect(byStatus.items.length).toBeGreaterThanOrEqual(2);
		expect(byCourse.items.map((item) => item.courseId)).toEqual(['course-002']);
		expect(byEmail.items.map((item) => item.learnerEmail)).toEqual(['filter-one@example.org']);
		expect(combined.items).toHaveLength(1);
		expect(combined.items[0]?.id).toBe(approved.id);
	});

	it('returns 400 for an invalid list status', () => {
		const result = enrollmentService().list({ status: 'published' });
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}

		expect(result.status).toBe(400);
		expect(result.error.code).toBe(INVALID_QUERY_PARAMETER_CODE);
		expect(result.error.details.map((detail) => detail.field)).toEqual(['status']);
	});

	it('supports pending to approved, rejected, and cancelled, and approved to cancelled', () => {
		const service = enrollmentService();
		const toApproved = requireOk(service.create(validCreate('to-approved@example.org')));
		const approved = requireOk(service.updateStatus(toApproved.id, { status: 'approved', changedBy: 'reviewer@example.org' }));
		const toRejected = requireOk(service.create(validCreate('to-rejected@example.org')));
		const rejected = requireOk(
			service.updateStatus(toRejected.id, {
				status: 'rejected',
				changedBy: 'reviewer@example.org',
				reason: 'Learner has not completed the prerequisite course.',
			}),
		);
		const toCancelled = requireOk(service.create(validCreate('to-cancelled@example.org')));
		const cancelledPending = requireOk(service.updateStatus(toCancelled.id, { status: 'cancelled', changedBy: 'reviewer@example.org' }));
		const approvedThenCancelled = requireOk(service.create(validCreate('approved-cancel@example.org')));
		requireOk(service.updateStatus(approvedThenCancelled.id, { status: 'approved', changedBy: 'reviewer@example.org' }));
		const cancelledApproved = requireOk(service.updateStatus(approvedThenCancelled.id, { status: 'cancelled', changedBy: 'reviewer@example.org' }));

		expect(approved.status).toBe('approved');
		expect(rejected.status).toBe('rejected');
		expect(cancelledPending.status).toBe('cancelled');
		expect(cancelledApproved.status).toBe('cancelled');
	});

	it('returns 409 for an invalid status transition', () => {
		const service = enrollmentService();
		const created = requireOk(service.create(validCreate('invalid-transition@example.org')));
		const rejected = requireOk(
			service.updateStatus(created.id, {
				status: 'rejected',
				changedBy: 'reviewer@example.org',
				reason: 'Learner has not completed the prerequisite course.',
			}),
		);
		const again = service.updateStatus(rejected.id, { status: 'approved', changedBy: 'reviewer@example.org' });

		expect(again.ok).toBe(false);
		if (again.ok) {
			return;
		}

		expect(again.status).toBe(409);
		expect(again.error.code).toBe(INVALID_STATUS_TRANSITION_CODE);
	});

	it('returns 400 when rejecting without a reason or with an invalid status value', () => {
		const service = enrollmentService();
		const created = requireOk(service.create(validCreate('reject-reason@example.org')));
		const missingReason = service.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org' });
		const emptyReason = service.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: '   ' });
		const invalidStatus = service.updateStatus(created.id, { status: 'published', changedBy: 'reviewer@example.org' });

		expect(missingReason.ok).toBe(false);
		expect(emptyReason.ok).toBe(false);
		expect(invalidStatus.ok).toBe(false);
		if (missingReason.ok || emptyReason.ok || invalidStatus.ok) {
			return;
		}

		expect(missingReason.status).toBe(400);
		expect(missingReason.error.code).toBe(INVALID_REQUEST_CODE);
		expect(missingReason.error.details.map((detail) => detail.field)).toEqual(['reason']);
		expect(emptyReason.error.details.map((detail) => detail.field)).toEqual(['reason']);
		expect(invalidStatus.error.details.map((detail) => detail.field)).toEqual(['status']);
	});

	it('appends a statusHistory entry for every status change', () => {
		const service = enrollmentService();
		const created = requireOk(service.create(validCreate('audit@example.org')));
		const approved = requireOk(service.updateStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' }));
		const cancelled = requireOk(service.updateStatus(approved.id, { status: 'cancelled', changedBy: 'operator@example.org', reason: 'Learner withdrew.' }));

		expect(cancelled.statusHistory).toHaveLength(3);
		expect(cancelled.statusHistory[0]).toMatchObject({ fromStatus: null, toStatus: 'pending', changedBy: 'system', reason: null });
		expect(cancelled.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'approved', changedBy: 'reviewer@example.org', reason: null });
		expect(cancelled.statusHistory[2]).toMatchObject({ fromStatus: 'approved', toStatus: 'cancelled', changedBy: 'operator@example.org', reason: 'Learner withdrew.' });
	});

	it('is available from the composed application services factory', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
		const created = services.enrollmentRequests.create(validCreate('factory@example.org'));
		expect(created.ok).toBe(true);
	});
});

function enrollmentService(courses: readonly Course[] = seededCourses) {
	return createEnrollmentRequestService(createInMemoryCourseReadRepository(courses), createInMemoryEnrollmentRequestRepository());
}

function validCreate(learnerEmail: string, courseId = 'course-001') {
	return {
		courseId,
		learnerEmail,
		justification: VALID_JUSTIFICATION,
	};
}

function requireOk<T>(result: { ok: true; value: T } | { ok: false; status: number; error: { code: string } }): T {
	expect(result.ok).toBe(true);
	if (!result.ok) {
		throw new Error(`expected ok result, received ${result.error.code}`);
	}

	return result.value;
}

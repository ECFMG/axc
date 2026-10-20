import { randomUUID } from 'node:crypto';
import { courses } from './courses.ts';
import { EnrollmentError, type EnrollmentFilters, type EnrollmentRequest, email, invalid, status, text, transition } from './enrollment-model.ts';
import { EnrollmentStore } from './enrollment-store.ts';

interface EnrollmentBody {
	courseId?: unknown;
	learnerEmail?: unknown;
	justification?: unknown;
	status?: unknown;
	changedBy?: unknown;
	reason?: unknown;
}
function object(value: unknown): EnrollmentBody {
	if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('body', 'body must be a JSON object.');
	return value as EnrollmentBody;
}

/** One service/repository per factory; survives requests and is isolated between app instances. */
export function createEnrollmentService() {
	const store = new EnrollmentStore();
	function get(id: string): EnrollmentRequest {
		const request = store.get(id);
		if (!request) throw new EnrollmentError('ENROLLMENT_REQUEST_NOT_FOUND', 404, 'Enrollment request not found.');
		return request;
	}
	return {
		create(value: unknown): EnrollmentRequest {
			const body = object(value);
			const courseId = text(body.courseId, 'courseId');
			const learnerEmail = email(body.learnerEmail);
			const justification = text(body.justification, 'justification');
			if (justification.length < 20 || justification.length > 500) invalid('justification', 'justification must be between 20 and 500 characters.');
			const course = courses.find((item) => item.id === courseId);
			if (!course) throw new EnrollmentError('COURSE_NOT_FOUND', 404, 'Course not found.');
			if (course.status !== 'active') throw new EnrollmentError('COURSE_NOT_ACTIVE', 409, 'Course must be active.');
			const now = new Date().toISOString();
			return store.insert({
				id: `enroll-${randomUUID()}`,
				courseId,
				learnerEmail,
				justification,
				status: 'pending',
				createdAt: now,
				updatedAt: now,
				statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: now, changedBy: 'system', reason: null }],
			});
		},
		get,
		list(filters: EnrollmentFilters): EnrollmentRequest[] {
			const learnerEmail = filters.learnerEmail === undefined ? undefined : email(filters.learnerEmail);
			if (filters.status !== undefined) status(filters.status);
			return store.list().filter((request) => (!filters.status || request.status === filters.status) && (!filters.courseId || request.courseId === filters.courseId) && (!learnerEmail || request.learnerEmail === learnerEmail));
		},
		changeStatus(id: string, value: unknown): EnrollmentRequest {
			const body = object(value);
			const toStatus = status(body.status);
			const changedBy = text(body.changedBy, 'changedBy');
			const reason = body.reason === undefined || body.reason === null ? null : text(body.reason, 'reason');
			if (toStatus === 'rejected' && !reason) invalid('reason', 'reason is required for rejection.');
			return store.save(transition(get(id), toStatus, changedBy, reason, new Date().toISOString()));
		},
	};
}
export type EnrollmentService = ReturnType<typeof createEnrollmentService>;

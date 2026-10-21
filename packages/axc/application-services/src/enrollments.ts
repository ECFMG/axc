import { randomUUID } from 'node:crypto';
import { type Course, courses } from './courses.ts';
import { changeEnrollmentStatus, EnrollmentError, type EnrollmentRequest, parseEnrollmentChange, parseEnrollmentCreation, parseEnrollmentFilter } from './enrollment-request.ts';
import { createEnrollmentStore } from './enrollment-store.ts';

export function createEnrollmentService(catalog: readonly Course[] = courses) {
	const store = createEnrollmentStore();
	function get(id: string): EnrollmentRequest {
		const request = store.get(id);
		if (!request) throw new EnrollmentError('ENROLLMENT_REQUEST_NOT_FOUND', 404, 'Enrollment request not found.');
		return request;
	}
	return {
		get,
		list(filter: unknown = {}): EnrollmentRequest[] {
			return store.list(parseEnrollmentFilter(filter));
		},
		create(body: unknown): EnrollmentRequest {
			const input = parseEnrollmentCreation(body);
			const course = catalog.find((course) => course.id === input.courseId);
			if (!course) throw new EnrollmentError('COURSE_NOT_FOUND', 404, 'Course not found.');
			if (course.status !== 'active') throw new EnrollmentError('COURSE_NOT_ACTIVE', 409, 'Course is not active.');
			// ponytail: synchronous check/save is atomic within one process; use a database constraint for multiple workers.
			if (store.list({ courseId: input.courseId, learnerEmail: input.learnerEmail }).some((request) => request.status === 'pending' || request.status === 'approved')) {
				throw new EnrollmentError('DUPLICATE_ACTIVE_REQUEST', 409, 'An active request already exists for this learner and course.');
			}
			const now = new Date().toISOString();
			const request: EnrollmentRequest = {
				...input,
				id: `enroll-${randomUUID()}`,
				status: 'pending',
				createdAt: now,
				updatedAt: now,
				statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: now, changedBy: 'system', reason: null }],
			};
			store.save(request);
			return request;
		},
		changeStatus(id: string, body: unknown): EnrollmentRequest {
			const change = parseEnrollmentChange(body);
			const updated = changeEnrollmentStatus(get(id), change, new Date().toISOString());
			store.save(updated);
			return updated;
		},
	};
}

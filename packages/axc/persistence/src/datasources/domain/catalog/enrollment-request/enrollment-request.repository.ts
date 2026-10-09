import type { EnrollmentRequest, EnrollmentRequestRepository } from '@axc/domain';
import { cloneRequest } from '../../../store.ts';
export const getEnrollmentRequestRepository = (working: Map<string, EnrollmentRequest>): EnrollmentRequestRepository => ({
	getById: (id) => {
		const item = working.get(id);
		return item ? cloneRequest(item) : null;
	},
	findActive: (courseId, learnerEmail) => {
		const item = [...working.values()].find((request) => request.courseId === courseId && request.learnerEmail === learnerEmail && (request.status === 'pending' || request.status === 'approved'));
		return item ? cloneRequest(item) : null;
	},
	save: (request) => {
		working.set(request.id, cloneRequest(request));
	},
});

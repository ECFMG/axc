import { type CourseRepository, DomainError, type EnrollmentRequestEntityReference, type EnrollmentRequestRepository, EnrollmentStatuses, invalidRequest, isEnrollmentStatus } from '@axc/domain';

export interface EnrollmentRequestApplicationService {
	create(body: unknown): Promise<EnrollmentRequestEntityReference>;
	getById(id: string): Promise<EnrollmentRequestEntityReference>;
	list(query: Record<string, string | undefined>): Promise<EnrollmentRequestEntityReference[]>;
	changeStatus(id: string, body: unknown): Promise<EnrollmentRequestEntityReference>;
}

const asRecord = (body: unknown): Record<string, unknown> => {
	if (typeof body !== 'object' || body === null || Array.isArray(body)) {
		throw invalidRequest([{ field: 'body', message: 'body must be a JSON object.' }]);
	}
	return body as Record<string, unknown>;
};

export const enrollmentRequestApplicationService = (courses: CourseRepository, requests: EnrollmentRequestRepository): EnrollmentRequestApplicationService => {
	const load = async (id: string) => {
		const request = await requests.getById(id);
		if (!request) throw new DomainError('ENROLLMENT_REQUEST_NOT_FOUND', `Enrollment request ${id} was not found.`);
		return request;
	};

	return {
		async create(body) {
			const { courseId, learnerEmail, justification } = asRecord(body);
			if (typeof courseId !== 'string' || courseId.trim() === '') {
				throw invalidRequest([{ field: 'courseId', message: 'courseId is required.' }]);
			}
			const request = await requests.getNewInstance({ courseId, learnerEmail, justification });
			const course = await courses.getById(courseId);
			if (!course) throw new DomainError('COURSE_NOT_FOUND', `Course ${courseId} was not found.`);
			if (!course.isActive) throw new DomainError('COURSE_NOT_ACTIVE', `Course ${courseId} is not active.`);
			const existing = await requests.find({ courseId, learnerEmail: request.props.learnerEmail });
			if (existing.some((r) => r.isActive)) {
				throw new DomainError('DUPLICATE_ACTIVE_REQUEST', 'The learner already has a pending or approved request for this course.');
			}
			return (await requests.save(request)).toReference();
		},

		async getById(id) {
			return (await load(id)).toReference();
		},

		async list({ status, courseId, learnerEmail }) {
			if (status !== undefined && !isEnrollmentStatus(status)) {
				throw invalidRequest([{ field: 'status', message: `status must be one of ${Object.values(EnrollmentStatuses).join(', ')}.` }]);
			}
			return (await requests.find({ status, courseId, learnerEmail })).map((r) => r.toReference());
		},

		async changeStatus(id, body) {
			const { status, changedBy, reason } = asRecord(body);
			const request = await load(id);
			request.changeStatus({ status, changedBy, reason }, new Date().toISOString());
			return (await requests.save(request)).toReference();
		},
	};
};

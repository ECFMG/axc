import { type CourseRepository, DomainError, EnrollmentRequest, type EnrollmentRequestProps, type EnrollmentRequestRepository, invalid, isEnrollmentStatus } from '@axc/domain';

export interface EnrollmentRequestService {
	create(body: unknown): Promise<EnrollmentRequestProps>;
	getById(id: string): Promise<EnrollmentRequestProps>;
	list(query: Record<string, string | undefined>): Promise<EnrollmentRequestProps[]>;
	updateStatus(id: string, body: unknown): Promise<EnrollmentRequestProps>;
}

const asRecord = (body: unknown): Record<string, unknown> => (typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {});

export function enrollmentRequestService(courses: CourseRepository, requests: EnrollmentRequestRepository): EnrollmentRequestService {
	const load = async (id: string) => {
		const request = await requests.getById(id);
		if (!request) throw new DomainError('ENROLLMENT_REQUEST_NOT_FOUND', `Enrollment request ${id} was not found.`);
		return request;
	};

	return {
		async create(body) {
			const input = EnrollmentRequest.validate(asRecord(body));
			EnrollmentRequest.assertEnrollable(input.courseId, await courses.getById(input.courseId));
			const existing = await requests.list({ courseId: input.courseId, learnerEmail: input.learnerEmail });
			if (existing.some((r) => r.isActive)) {
				throw new DomainError('DUPLICATE_ACTIVE_REQUEST', `${input.learnerEmail} already has a pending or approved request for ${input.courseId}.`);
			}
			const request = EnrollmentRequest.create(requests.nextId(), input, new Date().toISOString());
			return (await requests.save(request)).props;
		},

		async getById(id) {
			return (await load(id)).props;
		},

		async list({ status, courseId, learnerEmail }) {
			if (status !== undefined && !isEnrollmentStatus(status)) throw invalid('status', 'status must be one of pending, approved, rejected, cancelled.');
			return (await requests.list({ status, courseId, learnerEmail })).map((r) => r.props);
		},

		async updateStatus(id, body) {
			const { status, changedBy, reason } = asRecord(body);
			if (!isEnrollmentStatus(status)) throw invalid('status', 'status must be one of pending, approved, rejected, cancelled.');
			if (typeof changedBy !== 'string' || changedBy.trim() === '') throw invalid('changedBy', 'changedBy is required.');
			if (reason !== undefined && reason !== null && typeof reason !== 'string') throw invalid('reason', 'reason must be a string.');
			const request = await load(id);
			request.changeStatus(status, changedBy, typeof reason === 'string' ? reason : null, new Date().toISOString());
			return (await requests.save(request)).props;
		},
	};
}

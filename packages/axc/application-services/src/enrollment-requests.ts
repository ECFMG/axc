import { type CourseRepository, DomainError, type EnrollmentRequest, type EnrollmentRequestEntityReference, type EnrollmentRequestRepository, invalidRequest, isEnrollmentStatus, type StatusHistoryEntry } from '@axc/domain';

interface StatusHistoryDto extends Omit<StatusHistoryEntry, 'changedAt'> {
	changedAt: string;
}

export interface EnrollmentRequestDto extends Omit<EnrollmentRequestEntityReference, 'createdAt' | 'updatedAt' | 'statusHistory'> {
	createdAt: string;
	updatedAt: string;
	statusHistory: StatusHistoryDto[];
}

const toDto = ({ props }: EnrollmentRequest): EnrollmentRequestDto => ({
	...props,
	createdAt: props.createdAt.toISOString(),
	updatedAt: props.updatedAt.toISOString(),
	statusHistory: props.statusHistory.map((h) => ({ ...h, changedAt: h.changedAt.toISOString() })),
});

const asRecord = (body: unknown): Record<string, unknown> => {
	if (typeof body !== 'object' || body === null || Array.isArray(body)) throw invalidRequest([{ field: 'body', message: 'body must be a JSON object.' }]);
	return body as Record<string, unknown>;
};

export function enrollmentRequestServices(courses: CourseRepository, requests: EnrollmentRequestRepository) {
	const getOrThrow = async (id: string) => {
		const request = await requests.getById(id);
		if (!request) throw new DomainError('ENROLLMENT_REQUEST_NOT_FOUND', `Enrollment request ${id} was not found.`);
		return request;
	};

	return {
		async create(body: unknown): Promise<EnrollmentRequestDto> {
			const input = asRecord(body);
			const { courseId, learnerEmail, justification } = input;
			if (typeof courseId !== 'string' || courseId === '') throw invalidRequest([{ field: 'courseId', message: 'courseId is required.' }]);
			const request = requests.getNewInstance({ courseId, learnerEmail, justification });
			const course = await courses.getById(courseId);
			if (!course) throw new DomainError('COURSE_NOT_FOUND', `Course ${courseId} was not found.`);
			if (!course.isActive) throw new DomainError('COURSE_NOT_ACTIVE', `Course ${courseId} is not active.`);
			const existing = await requests.find({ courseId, learnerEmail: request.props.learnerEmail });
			if (existing.some((r) => r.isActive)) throw new DomainError('DUPLICATE_ACTIVE_REQUEST', 'The learner already has a pending or approved request for this course.');
			return toDto(await requests.save(request));
		},

		async getById(id: string): Promise<EnrollmentRequestDto> {
			return toDto(await getOrThrow(id));
		},

		async list(query: Record<string, string>): Promise<EnrollmentRequestDto[]> {
			const { status, courseId, learnerEmail } = query;
			if (status !== undefined && !isEnrollmentStatus(status)) throw invalidRequest([{ field: 'status', message: 'status must be one of pending, approved, rejected, cancelled.' }]);
			return (await requests.find({ status, courseId, learnerEmail })).map(toDto);
		},

		async changeStatus(id: string, body: unknown): Promise<EnrollmentRequestDto> {
			const input = asRecord(body);
			const request = await getOrThrow(id);
			const { status, changedBy, reason } = input;
			request.changeStatus(status, changedBy, reason);
			return toDto(await requests.save(request));
		},
	};
}

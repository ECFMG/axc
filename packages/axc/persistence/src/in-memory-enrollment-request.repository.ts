import { EnrollmentRequest, type EnrollmentRequestFilter, type EnrollmentRequestRepository } from '@axc/domain';
import { NotFoundError } from '@cellix/domain-seedwork/repository';

export class InMemoryEnrollmentRequestRepository implements EnrollmentRequestRepository {
	private readonly requests = new Map<string, EnrollmentRequest>();
	private sequence = 0;

	getNewInstance(input: { courseId: string; learnerEmail: unknown; justification: unknown }): Promise<EnrollmentRequest> {
		const id = `enroll-${String(this.sequence + 1).padStart(3, '0')}`;
		const request = EnrollmentRequest.create(id, input, new Date().toISOString());
		this.sequence += 1;
		return Promise.resolve(request);
	}

	getById(id: string): Promise<EnrollmentRequest | undefined> {
		return Promise.resolve(this.requests.get(id));
	}

	async get(id: string): Promise<EnrollmentRequest> {
		const request = await this.getById(id);
		if (!request) throw new NotFoundError(`Enrollment request ${id} not found`);
		return request;
	}

	save(item: EnrollmentRequest): Promise<EnrollmentRequest> {
		this.requests.set(item.id, item);
		return Promise.resolve(item);
	}

	find(filter: EnrollmentRequestFilter): Promise<EnrollmentRequest[]> {
		const email = filter.learnerEmail?.trim().toLowerCase();
		return Promise.resolve(
			[...this.requests.values()].filter(
				({ props }) => (filter.status === undefined || props.status === filter.status) && (filter.courseId === undefined || props.courseId === filter.courseId) && (email === undefined || props.learnerEmail === email),
			),
		);
	}
}

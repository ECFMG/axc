import { EnrollmentRequest, type EnrollmentRequestFilter, type EnrollmentRequestRepository, type NewEnrollmentRequest } from '@axc/domain';
import { NotFoundError } from '@cellix/domain-seedwork/repository';

export class InMemoryEnrollmentRequestRepository implements EnrollmentRequestRepository {
	private readonly requests = new Map<string, EnrollmentRequest>();
	private sequence = 0;

	getNewInstance(input: NewEnrollmentRequest): EnrollmentRequest {
		return EnrollmentRequest.getNewInstance(`enroll-${String(this.sequence + 1).padStart(3, '0')}`, input);
	}

	getById(id: string): Promise<EnrollmentRequest | undefined> {
		return Promise.resolve(this.requests.get(id));
	}

	async get(id: string): Promise<EnrollmentRequest> {
		const request = await this.getById(id);
		if (!request) throw new NotFoundError(`Enrollment request ${id} not found`);
		return request;
	}

	find(filter: EnrollmentRequestFilter): Promise<EnrollmentRequest[]> {
		const email = filter.learnerEmail?.toLowerCase();
		return Promise.resolve(
			[...this.requests.values()].filter(
				({ props }) => (filter.status === undefined || props.status === filter.status) && (filter.courseId === undefined || props.courseId === filter.courseId) && (email === undefined || props.learnerEmail === email),
			),
		);
	}

	save(item: EnrollmentRequest): Promise<EnrollmentRequest> {
		if (!this.requests.has(item.id)) this.sequence++;
		this.requests.set(item.id, item);
		return Promise.resolve(item);
	}
}

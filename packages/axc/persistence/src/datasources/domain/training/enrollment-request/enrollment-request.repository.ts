import { EnrollmentRequest, type EnrollmentRequestProps, type EnrollmentRequestRepository as RepositoryContract } from '@axc/domain';
import { cloneEnrollmentRequest } from './enrollment-request.domain-adapter.ts';
export class EnrollmentRequestRepository implements RepositoryContract {
	private readonly records: Map<string, EnrollmentRequestProps>;
	constructor(records: Map<string, EnrollmentRequestProps>) {
		this.records = records;
	}
	async get(id: string): Promise<EnrollmentRequest> {
		const found = await this.getById(id);
		if (!found) throw new Error(`Enrollment request ${id} not found`);
		return found;
	}
	async getById(id: string): Promise<EnrollmentRequest | null> {
		const props = this.records.get(id);
		return await Promise.resolve(props ? new EnrollmentRequest(cloneEnrollmentRequest(props), null) : null);
	}
	async findActive(courseId: string, learnerEmail: string): Promise<EnrollmentRequest | null> {
		const props = [...this.records.values()].find((item) => item.courseId === courseId && item.learnerEmail === learnerEmail && (item.status === 'pending' || item.status === 'approved'));
		return await Promise.resolve(props ? new EnrollmentRequest(cloneEnrollmentRequest(props), null) : null);
	}
	async save(item: EnrollmentRequest): Promise<EnrollmentRequest> {
		this.records.set(item.id, cloneEnrollmentRequest(item.props));
		return await Promise.resolve(new EnrollmentRequest(cloneEnrollmentRequest(item.props), null));
	}
}

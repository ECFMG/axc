import { Catalog } from '@axc/domain';
import type { Store } from '../../../store.ts';
import type { EnrollmentRequestConverter } from './enrollment-request.domain-adapter.ts';
export class EnrollmentRequestRepository implements Catalog.EnrollmentRequest.EnrollmentRequestRepository {
	private readonly store: Store;
	private readonly converter: EnrollmentRequestConverter;
	constructor(store: Store, converter: EnrollmentRequestConverter) {
		this.store = store;
		this.converter = converter;
	}
	getNewInstance(courseId: string, email: Catalog.EnrollmentRequest.LearnerEmail, justification: Catalog.EnrollmentRequest.Justification, at: string) {
		const id = `enroll-${String(this.store.nextId++).padStart(3, '0')}`;
		const adapter = this.converter.toAdapter({ id, courseId: '', learnerEmail: '', justification: '', status: 'pending', createdAt: at, updatedAt: at, statusHistory: [] });
		return Promise.resolve(Catalog.EnrollmentRequest.EnrollmentRequest.getNewInstance(adapter, courseId, email, justification, at));
	}
	getById(id: string) {
		const record = this.store.requests.get(id);
		return Promise.resolve(record ? this.converter.toDomain(record) : null);
	}
	async get(id: string) {
		const request = await this.getById(id);
		if (!request) throw new Error('Enrollment request not found.');
		return request;
	}
	findActive(courseId: string, learnerEmail: string) {
		const record = [...this.store.requests.values()].find((item) => item.courseId === courseId && item.learnerEmail === learnerEmail && ['pending', 'approved'].includes(item.status));
		return Promise.resolve(record ? this.converter.toDomain(record) : null);
	}
	save(item: Catalog.EnrollmentRequest.EnrollmentRequest) {
		this.store.requests.set(item.id, this.converter.toPersistence(item));
		return Promise.resolve(item);
	}
}

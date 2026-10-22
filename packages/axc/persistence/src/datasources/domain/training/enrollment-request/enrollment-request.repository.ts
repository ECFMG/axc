import { randomUUID } from 'node:crypto';
import { Training } from '@axc/domain';
import type { Store } from '../../../store.ts';
import type { EnrollmentRequestConverter, EnrollmentRequestDomainAdapter } from './enrollment-request.domain-adapter.ts';
export class EnrollmentRequestRepository implements Training.EnrollmentRequest.EnrollmentRequestRepository<EnrollmentRequestDomainAdapter> {
	private readonly store: Store;
	private readonly converter: EnrollmentRequestConverter;
	constructor(store: Store, converter: EnrollmentRequestConverter) {
		this.store = store;
		this.converter = converter;
	}
	async getNewInstance(courseId: string, email: Training.EnrollmentRequest.LearnerEmail, justification: Training.EnrollmentRequest.Justification, at: string) {
		const adapter = this.converter.toAdapter({ id: `enroll-${randomUUID()}`, courseId: '', learnerEmail: '', justification: '', status: 'pending', createdAt: '', updatedAt: '', statusHistory: [] });
		return await Promise.resolve(Training.EnrollmentRequest.EnrollmentRequest.getNewInstance(adapter, courseId, email, justification, at));
	}
	async getById(id: string) {
		const record = this.store.requests.find((item) => item.id === id);
		return await Promise.resolve(record ? this.converter.toDomain(record) : null);
	}
	async get(id: string) {
		const request = await this.getById(id);
		if (!request) throw new Error('Enrollment request not found');
		return request;
	}
	async hasActive(courseId: string, email: string) {
		return await Promise.resolve(this.store.requests.some((item) => item.courseId === courseId && item.learnerEmail === email && ['pending', 'approved'].includes(item.status)));
	}
	async save(item: Training.EnrollmentRequest.EnrollmentRequest<EnrollmentRequestDomainAdapter>) {
		const record = this.converter.toRecord(item);
		const index = this.store.requests.findIndex((existing) => existing.id === record.id);
		if (index < 0) this.store.requests.push(record);
		else this.store.requests[index] = record;
		item.onSave(index >= 0);
		return await Promise.resolve(item);
	}
}

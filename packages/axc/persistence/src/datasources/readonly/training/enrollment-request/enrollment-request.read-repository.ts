import type { Domain } from '@axc/domain';
import type { FilterQuery } from 'mongoose';
import type { EnrollmentRequestDocument, ModelsContext } from '../../../../models/index.ts';
import { EnrollmentRequestDomainAdapter } from '../../../domain/training/enrollment-request/enrollment-request.domain-adapter.ts';
export function getEnrollmentRequestReadRepository(models: ModelsContext): Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestReadRepository {
	return {
		async getById(id) {
			const doc = await models.EnrollmentRequest.findOne({ requestId: id }).exec();
			return doc === null ? null : new EnrollmentRequestDomainAdapter(doc).toDomain().toSnapshot();
		},
		async list(criteria) {
			const filter: FilterQuery<EnrollmentRequestDocument> = {};
			if (criteria.status !== undefined) {
				filter.status = criteria.status;
			}
			if (criteria.courseId !== undefined) {
				filter.courseId = criteria.courseId;
			}
			if (criteria.learnerEmail !== undefined) {
				filter.learnerEmail = criteria.learnerEmail;
			}
			const docs = await models.EnrollmentRequest.find(filter).sort({ createdAt: 1, requestId: 1 }).exec();
			return docs.map((doc) => new EnrollmentRequestDomainAdapter(doc).toDomain().toSnapshot());
		},
	};
}

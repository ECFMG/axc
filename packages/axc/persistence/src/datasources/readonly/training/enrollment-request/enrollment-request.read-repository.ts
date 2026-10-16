import type { Domain } from '@axc/domain';
import type { EnrollmentRequestModelType } from '../../../../models/training/enrollment-request.model.ts';
export const getEnrollmentRequestReadRepository = (model: EnrollmentRequestModelType): Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestReadRepository => ({
	async getById(id) {
		const document = await model.findOne({ 'record.id': id }).lean().exec();
		return document?.record;
	},
	async list(criteria) {
		const filter: Record<string, unknown> = {};
		if (criteria.status !== undefined) {
			filter['record.status'] = criteria.status;
		}
		if (criteria.courseId !== undefined) {
			filter['record.courseId'] = criteria.courseId;
		}
		if (criteria.learnerEmail !== undefined) {
			filter['record.learnerEmail'] = criteria.learnerEmail.trim().toLowerCase();
		}
		const documents = await model.find(filter).sort({ 'record.createdAt': 1, 'record.id': 1 }).lean().exec();
		return documents.map((document) => document.record);
	},
});

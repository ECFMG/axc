import type { Domain } from '@axc/domain';
import { type FilterQuery, isObjectIdOrHexString } from 'mongoose';
import type { EnrollmentRequestDocument, EnrollmentRequestModelType } from '../../../../models/training/enrollment-request.model.ts';

const enrollmentRequestRecord = (doc: EnrollmentRequestDocument): Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequest => ({
	id: doc._id.toString(),
	courseId: doc.courseId,
	learnerEmail: doc.learnerEmail,
	justification: doc.justification,
	status: doc.status,
	createdAt: doc.createdAt.toISOString(),
	updatedAt: doc.updatedAt.toISOString(),
	statusHistory: doc.statusHistory.map((entry) => ({ fromStatus: entry.fromStatus, toStatus: entry.toStatus, changedAt: entry.changedAt, changedBy: entry.changedBy, reason: entry.reason })),
});
export const getEnrollmentRequestReadRepository = (model: EnrollmentRequestModelType): Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestReadRepository => ({
	async queryById(id) {
		if (!isObjectIdOrHexString(id)) {
			return undefined;
		}
		const doc = await model.findById(id).exec();
		return doc === null ? undefined : enrollmentRequestRecord(doc);
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
			filter.learnerEmail = criteria.learnerEmail.toLowerCase();
		}
		return (await model.find(filter).sort({ createdAt: 1, _id: 1 }).exec()).map(enrollmentRequestRecord);
	},
});

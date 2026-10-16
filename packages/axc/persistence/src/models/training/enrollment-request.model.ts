import { Domain } from '@axc/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { type Model, Schema } from 'mongoose';
export interface EnrollmentRequestDocument extends MongooseSeedwork.Base {
	requestId: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: Domain.Contexts.Training.EnrollmentRequest.EnrollmentStatus;
	statusHistory: Domain.Contexts.Training.EnrollmentRequest.StatusHistoryEntry[];
}
const historySchema = new Schema(
	{
		fromStatus: { type: String, default: null },
		toStatus: { type: String, required: true },
		changedAt: { type: String, required: true },
		changedBy: { type: String, required: true },
		reason: { type: String, default: null },
	},
	{ _id: false },
);
const schema = new Schema<EnrollmentRequestDocument, Model<EnrollmentRequestDocument>, EnrollmentRequestDocument>(
	{
		requestId: { type: String, required: true, unique: true },
		courseId: { type: String, required: true },
		learnerEmail: { type: String, required: true },
		justification: { type: String, required: true },
		status: { type: String, enum: Domain.Contexts.Training.EnrollmentRequest.ENROLLMENT_STATUSES, required: true },
		statusHistory: { type: [historySchema], required: true },
		schemaVersion: { type: String, default: '1' },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	},
	{ versionKey: 'version' },
);
schema.index({ courseId: 1, learnerEmail: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['pending', 'approved'] } } });
export const getEnrollmentRequestModel = MongooseSeedwork.modelFactory<EnrollmentRequestDocument>('EnrollmentRequest', schema);

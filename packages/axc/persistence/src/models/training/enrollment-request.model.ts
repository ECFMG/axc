import { Domain } from '@axc/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { type Model, Schema } from 'mongoose';
export interface EnrollmentRequestDocument extends MongooseSeedwork.Base {
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestStatus;
	statusHistory: Domain.Contexts.Training.EnrollmentRequest.StatusHistoryEntry[];
}
const historySchema = new Schema(
	{ fromStatus: { type: String, default: null }, toStatus: { type: String, required: true }, changedAt: { type: String, required: true }, changedBy: { type: String, required: true }, reason: { type: String, default: null } },
	{ _id: false },
);
const enrollmentRequestSchema = new Schema<EnrollmentRequestDocument, Model<EnrollmentRequestDocument>, EnrollmentRequestDocument>(
	{
		schemaVersion: { type: String, default: '1' },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
		courseId: { type: String, required: true },
		learnerEmail: { type: String, required: true },
		justification: { type: String, required: true, minlength: 20, maxlength: 500 },
		status: { type: String, required: true, enum: Domain.Contexts.Training.EnrollmentRequest.ENROLLMENT_REQUEST_STATUSES },
		statusHistory: [historySchema],
	},
	{ timestamps: false, versionKey: 'version', optimisticConcurrency: true },
);
enrollmentRequestSchema.index({ courseId: 1, learnerEmail: 1 }, { unique: true, partialFilterExpression: { status: { $in: Domain.Contexts.Training.EnrollmentRequest.ACTIVE_ENROLLMENT_REQUEST_STATUSES } } });
export const EnrollmentRequestModelName = 'EnrollmentRequest';
export const EnrollmentRequestModelFactory = MongooseSeedwork.modelFactory<EnrollmentRequestDocument>(EnrollmentRequestModelName, enrollmentRequestSchema);
export type EnrollmentRequestModelType = ReturnType<typeof EnrollmentRequestModelFactory>;

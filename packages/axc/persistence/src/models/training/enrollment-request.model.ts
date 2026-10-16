import type { Domain } from '@axc/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { type Model, Schema } from 'mongoose';
export interface EnrollmentRequestDocument extends MongooseSeedwork.Base {
	record: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestRecord;
}
const enrollmentRequestSchema = new Schema<EnrollmentRequestDocument, Model<EnrollmentRequestDocument>, EnrollmentRequestDocument>(
	{ record: { type: Schema.Types.Mixed, required: true } },
	{ timestamps: true, versionKey: 'version', optimisticConcurrency: true },
);
enrollmentRequestSchema.index({ 'record.id': 1 }, { unique: true });
enrollmentRequestSchema.index({ 'record.courseId': 1, 'record.learnerEmail': 1 }, { unique: true, partialFilterExpression: { 'record.status': { $in: ['pending', 'approved'] } } });
export const EnrollmentRequestModelName = 'EnrollmentRequest';
export const EnrollmentRequestModelFactory = MongooseSeedwork.modelFactory<EnrollmentRequestDocument>(EnrollmentRequestModelName, enrollmentRequestSchema);
export type EnrollmentRequestModelType = ReturnType<typeof EnrollmentRequestModelFactory>;

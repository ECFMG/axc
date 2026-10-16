import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { type Model, Schema } from 'mongoose';

export interface EnrollmentRequestStatusHistory {
	fromStatus: string | null;
	toStatus: string;
	changedAt: Date;
	changedBy: string;
	reason: string | null;
}

export interface EnrollmentRequest extends MongooseSeedwork.Base {
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: string;
	statusHistory: EnrollmentRequestStatusHistory[];
}

const EnrollmentRequestStatusHistorySchema = new Schema<EnrollmentRequestStatusHistory>(
	{
		fromStatus: { type: String, required: false, default: null },
		toStatus: { type: String, required: true },
		changedAt: { type: Date, required: true },
		changedBy: { type: String, required: true },
		reason: { type: String, required: false, default: null },
	},
	{ _id: false },
);

const EnrollmentRequestSchema = new Schema<EnrollmentRequest, Model<EnrollmentRequest>, EnrollmentRequest>(
	{
		schemaVersion: { type: String, default: '1.0.0' },
		courseId: { type: String, required: true, minlength: 1, maxlength: 200 },
		learnerEmail: { type: String, required: true, minlength: 3, maxlength: 320 },
		justification: { type: String, required: true, minlength: 20, maxlength: 500 },
		status: { type: String, required: true, enum: ['pending', 'approved', 'rejected', 'cancelled'] },
		statusHistory: { type: [EnrollmentRequestStatusHistorySchema], required: true, default: [] },
	},
	{ timestamps: true, versionKey: 'version' },
);

export const EnrollmentRequestModelName = 'EnrollmentRequest';
export const EnrollmentRequestModelFactory = MongooseSeedwork.modelFactory<EnrollmentRequest>(EnrollmentRequestModelName, EnrollmentRequestSchema);
export type EnrollmentRequestModelType = ReturnType<typeof EnrollmentRequestModelFactory>;

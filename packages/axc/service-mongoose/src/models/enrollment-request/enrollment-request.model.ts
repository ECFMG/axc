import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { type Model, Schema } from 'mongoose';

export const enrollmentRequestStatuses = ['pending', 'approved', 'rejected', 'cancelled'] as const;
type EnrollmentRequestStatus = (typeof enrollmentRequestStatuses)[number];

export interface StatusHistoryEntry {
	fromStatus: EnrollmentRequestStatus | null;
	toStatus: EnrollmentRequestStatus;
	changedAt: Date;
	changedBy: string;
	reason: string | null;
}

export interface EnrollmentRequest extends MongooseSeedwork.Base {
	courseId: string;
	/** Stored lowercase; duplicate detection compares on this value. */
	learnerEmail: string;
	justification: string;
	status: EnrollmentRequestStatus;
	statusHistory: StatusHistoryEntry[];
}

const StatusHistoryEntrySchema = new Schema<StatusHistoryEntry>(
	{
		fromStatus: { type: String, enum: [...enrollmentRequestStatuses, null], default: null },
		toStatus: { type: String, required: true, enum: enrollmentRequestStatuses },
		changedAt: { type: Date, required: true },
		changedBy: { type: String, required: true },
		reason: { type: String, default: null },
	},
	{ _id: false },
);

const EnrollmentRequestSchema = new Schema<EnrollmentRequest, Model<EnrollmentRequest>, EnrollmentRequest>(
	{
		courseId: { type: String, required: true, index: true },
		learnerEmail: { type: String, required: true, index: true },
		justification: { type: String, required: true },
		status: { type: String, required: true, enum: enrollmentRequestStatuses, index: true },
		statusHistory: { type: [StatusHistoryEntrySchema], default: [] },
		schemaVersion: { type: String, default: '1.0.0' },
	},
	// Optimistic concurrency: two reviewers changing the same request at once cannot both win.
	{ timestamps: true, versionKey: 'version', optimisticConcurrency: true },
);

// Backstop for duplicate prevention under concurrency: at most one pending or approved request per learner and course.
EnrollmentRequestSchema.index({ courseId: 1, learnerEmail: 1 }, { unique: true, name: 'one_active_request_per_learner_course', partialFilterExpression: { status: { $in: ['pending', 'approved'] } } });

export const EnrollmentRequestModelName = 'EnrollmentRequest';
export const EnrollmentRequestModelFactory = MongooseSeedwork.modelFactory<EnrollmentRequest>(EnrollmentRequestModelName, EnrollmentRequestSchema);
export type EnrollmentRequestModelType = ReturnType<typeof EnrollmentRequestModelFactory>;

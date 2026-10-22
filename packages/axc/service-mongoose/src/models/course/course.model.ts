import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { type Model, Schema } from 'mongoose';

export const courseModalities = ['online', 'in-person', 'hybrid'] as const;
export const courseStatuses = ['draft', 'active', 'retired'] as const;

export interface Course extends MongooseSeedwork.Base {
	title: string;
	summary: string;
	modality: (typeof courseModalities)[number];
	status: (typeof courseStatuses)[number];
	/** Stored lowercase so tag filters match case-insensitively on an index. */
	tags: string[];
}

const CourseSchema = new Schema<Course, Model<Course>, Course>(
	{
		title: { type: String, required: true },
		summary: { type: String, required: true },
		modality: { type: String, required: true, enum: courseModalities },
		status: { type: String, required: true, enum: courseStatuses, index: true },
		tags: { type: [String], default: [], index: true },
		schemaVersion: { type: String, default: '1.0.0' },
	},
	{ timestamps: true, versionKey: 'version' },
);

export const CourseModelName = 'Course';
export const CourseModelFactory = MongooseSeedwork.modelFactory<Course>(CourseModelName, CourseSchema);
export type CourseModelType = ReturnType<typeof CourseModelFactory>;

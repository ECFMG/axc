import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { type Model, Schema } from 'mongoose';

export interface Course extends MongooseSeedwork.Base {
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
}

const CourseSchema = new Schema<Course, Model<Course>, Course>(
	{
		schemaVersion: { type: String, default: '1.0.0' },
		title: { type: String, required: true, minlength: 1, maxlength: 200 },
		summary: { type: String, required: true, minlength: 1, maxlength: 500 },
		modality: { type: String, required: true, enum: ['online', 'in-person', 'hybrid'] },
		status: { type: String, required: true, enum: ['draft', 'active', 'retired'] },
		tags: { type: [String], required: true },
	},
	{ timestamps: true, versionKey: 'version' },
);

export const CourseModelName = 'Course';
export const CourseModelFactory = MongooseSeedwork.modelFactory<Course>(CourseModelName, CourseSchema);
export type CourseModelType = ReturnType<typeof CourseModelFactory>;

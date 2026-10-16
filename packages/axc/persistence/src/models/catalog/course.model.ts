import { Domain } from '@axc/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { type Model, Schema } from 'mongoose';

export interface Course extends MongooseSeedwork.Base {
	courseId: string;
	title: string;
	summary: string;
	modality: Domain.Contexts.Catalog.Course.CourseEntityReference['modality'];
	status: Domain.Contexts.Catalog.Course.CourseEntityReference['status'];
	tags: string[];
}

const CourseSchema = new Schema<Course, Model<Course>, Course>(
	{
		schemaVersion: { type: String, default: '1.0.0' },
		courseId: { type: String, required: true, unique: true },
		title: { type: String, required: true },
		summary: { type: String, required: true },
		modality: { type: String, required: true, enum: Domain.Contexts.Catalog.Course.COURSE_MODALITIES },
		status: { type: String, required: true, enum: Domain.Contexts.Catalog.Course.COURSE_STATUSES },
		tags: { type: [String], required: true },
	},
	{ timestamps: true, versionKey: 'version' },
);

export const CourseModelName = 'Course';
export const CourseModelFactory = MongooseSeedwork.modelFactory<Course>(CourseModelName, CourseSchema);
export type CourseModelType = ReturnType<typeof CourseModelFactory>;

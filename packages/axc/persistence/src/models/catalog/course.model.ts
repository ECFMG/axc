import { Domain } from '@axc/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { type Model, Schema } from 'mongoose';

export interface CourseDocument extends MongooseSeedwork.Base {
	courseId: string;
	title: string;
	summary: string;
	modality: Domain.Contexts.Catalog.Course.CourseModality;
	status: Domain.Contexts.Catalog.Course.CourseStatus;
	tags: string[];
}

const courseSchema = new Schema<CourseDocument, Model<CourseDocument>, CourseDocument>(
	{
		courseId: { type: String, required: true, unique: true },
		title: { type: String, required: true },
		summary: { type: String, required: true },
		modality: { type: String, required: true, enum: Domain.Contexts.Catalog.Course.COURSE_MODALITIES },
		status: { type: String, required: true, enum: Domain.Contexts.Catalog.Course.COURSE_STATUSES },
		tags: { type: [String], required: true },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	},
	{ versionKey: false },
);

export const getCourseModel = MongooseSeedwork.modelFactory<CourseDocument>('Course', courseSchema);

import { Domain } from '@axc/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { type Model, Schema } from 'mongoose';
export interface CourseDocument extends MongooseSeedwork.Base {
	courseId: string;
	title: string;
	summary: string;
	modality: Domain.Contexts.Training.Course.CourseModality;
	status: Domain.Contexts.Training.Course.CourseStatus;
	tags: string[];
}
const schema = new Schema<CourseDocument, Model<CourseDocument>, CourseDocument>(
	{
		courseId: { type: String, required: true, unique: true },
		title: { type: String, required: true },
		summary: { type: String, required: true },
		modality: { type: String, enum: Domain.Contexts.Training.Course.COURSE_MODALITIES, required: true },
		status: { type: String, enum: Domain.Contexts.Training.Course.COURSE_STATUSES, required: true },
		tags: { type: [String], required: true },
		schemaVersion: { type: String, default: '1' },
	},
	{ timestamps: true, versionKey: 'version' },
);
export const getCourseModel = MongooseSeedwork.modelFactory<CourseDocument>('Course', schema);

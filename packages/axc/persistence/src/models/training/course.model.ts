import { Domain } from '@axc/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { type Model, Schema } from 'mongoose';
export interface CourseDocument extends MongooseSeedwork.Base {
	courseId: string;
	title: string;
	summary: string;
	modality: Domain.Contexts.Training.Course.Course['modality'];
	status: Domain.Contexts.Training.Course.Course['status'];
	tags: string[];
}
const courseSchema = new Schema<CourseDocument, Model<CourseDocument>, CourseDocument>(
	{
		schemaVersion: { type: String, default: '1' },
		courseId: { type: String, required: true, unique: true },
		title: { type: String, required: true },
		summary: { type: String, required: true },
		modality: { type: String, enum: Domain.Contexts.Training.Course.COURSE_MODALITIES, required: true },
		status: { type: String, enum: Domain.Contexts.Training.Course.COURSE_STATUSES, required: true },
		tags: [String],
	},
	{ timestamps: true, versionKey: 'version' },
);
export const CourseModelName = 'Course';
export const CourseModelFactory = MongooseSeedwork.modelFactory<CourseDocument>(CourseModelName, courseSchema);
export type CourseModelType = ReturnType<typeof CourseModelFactory>;

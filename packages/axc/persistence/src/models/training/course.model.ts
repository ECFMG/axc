import type { Domain } from '@axc/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { type Model, Schema } from 'mongoose';
export interface CourseDocument extends MongooseSeedwork.Base {
	record: Domain.Contexts.Training.Course.Course;
}
const courseSchema = new Schema<CourseDocument, Model<CourseDocument>, CourseDocument>({ record: { type: Schema.Types.Mixed, required: true } }, { timestamps: true, versionKey: 'version' });
courseSchema.index({ 'record.id': 1 }, { unique: true });
export const CourseModelName = 'TrainingCourse';
export const CourseModelFactory = MongooseSeedwork.modelFactory<CourseDocument>(CourseModelName, courseSchema);
export type CourseModelType = ReturnType<typeof CourseModelFactory>;

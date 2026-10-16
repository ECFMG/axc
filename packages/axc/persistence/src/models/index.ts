import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { getCourseModel, getEnrollmentRequestModel } from './training/index.ts';
export function getModels(context: MongooseSeedwork.MongooseContextFactory) {
	return { Course: getCourseModel(context), EnrollmentRequest: getEnrollmentRequestModel(context) };
}
export type ModelsContext = ReturnType<typeof getModels>;
export * from './training/index.ts';

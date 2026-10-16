import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { getModels, type ModelsContext } from './models/index.ts';
import { COURSE_SEED } from './seed/index.ts';
export async function initializeTrainingModels(models: ModelsContext, seed: boolean): Promise<void> {
	await Promise.all([models.Course.init(), models.EnrollmentRequest.init()]);
	if (seed) {
		await models.Course.bulkWrite(
			COURSE_SEED.map(({ id, ...course }) => ({
				updateOne: { filter: { courseId: id }, update: { $setOnInsert: { ...course, createdAt: new Date(course.createdAt), updatedAt: new Date(course.updatedAt), courseId: id } }, upsert: true, timestamps: false },
			})),
		);
	}
}
export async function initializeTrainingStorage(context: MongooseSeedwork.MongooseContextFactory, seed: boolean): Promise<void> {
	await initializeTrainingModels(getModels(context), seed);
}

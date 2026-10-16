import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { getCourseModel } from './catalog/index.ts';
export function createModels(context: MongooseSeedwork.MongooseContextFactory) {
	return { Catalog: { Course: getCourseModel(context) } };
}
export type ModelsContext = ReturnType<typeof createModels>;

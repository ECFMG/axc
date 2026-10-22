import type { ModelsContext } from '@axc/service-mongoose';
import { CourseDataSource } from './course.data.ts';
import { CourseReadRepositoryImpl } from './course.read-repository.ts';

export type { CourseReadModel, CourseSearchCriteria, CourseSortField } from './course.read-repository.ts';

export const CourseReadonlyPersistence = (models: ModelsContext) => ({
	CourseReadRepo: new CourseReadRepositoryImpl(new CourseDataSource(models.Course)),
});

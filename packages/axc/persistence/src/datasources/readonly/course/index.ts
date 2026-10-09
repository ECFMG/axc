import type { CourseModelType } from '@axc/data-sources-mongoose-models';
import type { Domain } from '@axc/domain';
import { CourseReadRepositoryImpl } from './course/index.ts';

export const CourseContext = (models: { Course: CourseModelType }, passport: Domain.Passport) => ({
	Course: CourseReadRepositoryImpl(models, passport),
});

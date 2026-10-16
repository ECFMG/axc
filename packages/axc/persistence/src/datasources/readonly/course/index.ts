import type { Domain } from '@axc/domain';
import type { ModelsContext } from '@axc/persistence';
import { CourseReadRepositoryImpl } from './course/index.ts';

export const CourseContext = (models: ModelsContext, passport: Domain.Passport) => ({
	Course: CourseReadRepositoryImpl(models, passport),
});

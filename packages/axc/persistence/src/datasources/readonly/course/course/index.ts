import type { Domain } from '@axc/domain';
import type { ModelsContext } from '@axc/persistence';
import { getCourseReadRepository } from './course.read-repository.ts';

export type { CourseReadRepository } from './course.read-repository.ts';

export const CourseReadRepositoryImpl = (models: ModelsContext, passport: Domain.Passport) => {
	return {
		CourseReadRepo: getCourseReadRepository(models, passport),
	};
};

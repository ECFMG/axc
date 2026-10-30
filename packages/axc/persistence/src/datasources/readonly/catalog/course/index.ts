import type { Domain } from '@axc/domain';
import type { ModelsContext } from '../../../../models-context.ts';
import { type CourseReadRepositoryImpl as CourseReadRepositoryClass, getCourseReadRepository } from './course.read-repository.ts';

export const CourseReadRepositoryImpl = (models: ModelsContext, passport: Domain.Passport) => {
	const repository: CourseReadRepositoryClass = getCourseReadRepository(models, passport);
	return {
		CourseReadRepo: repository,
	};
};

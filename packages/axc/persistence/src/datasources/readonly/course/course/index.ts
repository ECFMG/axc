import type { CourseModelType } from '@axc/data-sources-mongoose-models';
import type { Domain } from '@axc/domain';
import { getCourseReadRepository } from './course.read-repository.ts';

export type { CourseReadRepository } from './course.read-repository.ts';

export const CourseReadRepositoryImpl = (models: { Course: CourseModelType }, passport: Domain.Passport) => {
	return {
		CourseReadRepo: getCourseReadRepository(models, passport),
	};
};

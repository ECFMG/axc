import type { Domain } from '@axc/domain';
import type { ModelsContext } from '../../../../models-context.ts';
import { getCourseUnitOfWork } from './course.uow.ts';

export const CoursePersistence = (models: ModelsContext, passport: Domain.Passport) => {
	const CourseModel = models.Course;
	return {
		CourseUnitOfWork: getCourseUnitOfWork(CourseModel, passport),
	};
};

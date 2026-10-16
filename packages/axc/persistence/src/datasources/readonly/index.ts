import type { Domain } from '@axc/domain';
import type { ModelsContext } from '@axc/persistence';
import type { CourseReadRepository } from './course/course/course.read-repository.ts';
import { CourseContext } from './course/index.ts';

export interface ReadonlyDataSource {
	Course: {
		Course: {
			CourseReadRepo: CourseReadRepository;
		};
	};
}

export const ReadonlyDataSourceImplementation = (models: ModelsContext, passport: Domain.Passport): ReadonlyDataSource => ({
	Course: CourseContext(models, passport),
});

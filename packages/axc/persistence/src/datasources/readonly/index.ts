import type { CourseModelType } from '@axc/data-sources-mongoose-models';
import type { Domain } from '@axc/domain';
import type { CourseReadRepository } from './course/course/course.read-repository.ts';
import { CourseContext } from './course/index.ts';

export interface ReadonlyDataSource {
	Course: {
		Course: {
			CourseReadRepo: CourseReadRepository;
		};
	};
}

export const ReadonlyDataSourceImplementation = (models: { Course: CourseModelType }, passport: Domain.Passport): ReadonlyDataSource => ({
	Course: CourseContext(models, passport),
});

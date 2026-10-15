import type { Domain } from '@axc/domain';
import { Catalog } from './readonly/index.ts';

export interface DataSources {
	readonlyDataSource: {
		Catalog: {
			Course: { CourseReadRepo: Catalog.Course.CourseReadRepository };
		};
	};
}

export function buildDataSources(courses: readonly Domain.Contexts.Catalog.Course.Course[]): DataSources {
	return {
		readonlyDataSource: {
			Catalog: { Course: { CourseReadRepo: Catalog.Course.buildCourseReadRepository(courses) } },
		},
	};
}

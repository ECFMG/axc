export type { UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';

import type { CourseReadRepository } from '@axc/domain';
import { courseReadRepository } from './datasources/readonly/course.ts';

export interface DataSources {
	readonlyDataSource: {
		Catalog: { CourseReadRepo: CourseReadRepository };
	};
}

export const createDataSources = (): DataSources => ({
	readonlyDataSource: { Catalog: { CourseReadRepo: courseReadRepository } },
});

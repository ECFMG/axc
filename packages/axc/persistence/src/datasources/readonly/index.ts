import type { ModelsContext } from '@axc/service-mongoose';
import { CourseReadonlyPersistence } from './catalog/course/index.ts';
import { EnrollmentRequestReadonlyPersistence } from './enrollment/enrollment-request/index.ts';

export type { CourseReadModel, CourseSearchCriteria, CourseSortField } from './catalog/course/index.ts';
export type { EnrollmentRequestReadModel, EnrollmentRequestSearchCriteria } from './enrollment/enrollment-request/index.ts';

export const ReadonlyDataSourceImplementation = (models: ModelsContext) => ({
	Catalog: {
		Course: CourseReadonlyPersistence(models),
	},
	Enrollment: {
		EnrollmentRequest: EnrollmentRequestReadonlyPersistence(models),
	},
});

export type ReadonlyDataSource = ReturnType<typeof ReadonlyDataSourceImplementation>;

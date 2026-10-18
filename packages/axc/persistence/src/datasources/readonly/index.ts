import type { Domain } from '@axc/domain';
import type { CourseReadRepository } from './catalog/course/course.read-repository.ts';
export interface ReadonlyDataSource {
	Catalog: {
		Course: { CourseReadRepo: CourseReadRepository };
		EnrollmentRequest: { list(filter: Domain.Contexts.Catalog.EnrollmentFilter): Promise<Domain.Contexts.Catalog.EnrollmentProps[]>; getById(id: string): Promise<Domain.Contexts.Catalog.EnrollmentProps | undefined> };
	};
}

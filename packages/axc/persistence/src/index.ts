export type { UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';

import { enrollmentStore } from './datasources/domain/catalog/enrollment-request/enrollment-request.uow.ts';
import type { DataSourcesFactory } from './datasources/index.ts';
import { courseReadRepository } from './datasources/readonly/catalog/course/course.read-repository.ts';

export type { DataSources, DataSourcesFactory } from './datasources/index.ts';
export function Persistence(): DataSourcesFactory {
	const store = enrollmentStore();
	const sources = { readonlyDataSource: { Catalog: { Course: { CourseReadRepo: courseReadRepository() }, EnrollmentRequest: store.reader } }, domainDataSource: { Catalog: { EnrollmentRequest: store.uow } } };
	return { withSystemPassport: () => sources };
}

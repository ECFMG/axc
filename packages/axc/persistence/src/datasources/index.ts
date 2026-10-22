import type { Domain } from '@axc/domain';
import { EnrollmentRequestUow } from './domain/catalog/enrollment-request/enrollment-request.uow.ts';
import { CourseReadRepo } from './readonly/catalog/course/course.read-repository.ts';
import { EnrollmentRequestReadRepo } from './readonly/catalog/enrollment-request/enrollment-request.read-repository.ts';
import type { ReadonlyDataSource } from './readonly/index.ts';
export interface DataSources {
	readonlyDataSource: ReadonlyDataSource;
	domainDataSource: { Catalog: { EnrollmentRequest: { EnrollmentRequestUow: Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestUnitOfWork } } };
}
export interface DataSourcesFactory {
	withSystemPassport(): DataSources;
}
export function Persistence(): DataSourcesFactory {
	const store = new Map<string, Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestProps>();
	const sources: DataSources = {
		readonlyDataSource: { Catalog: { Course: { CourseReadRepo }, EnrollmentRequest: { EnrollmentRequestReadRepo: EnrollmentRequestReadRepo(store) } } },
		domainDataSource: { Catalog: { EnrollmentRequest: { EnrollmentRequestUow: EnrollmentRequestUow(store) } } },
	};
	return { withSystemPassport: () => sources };
}

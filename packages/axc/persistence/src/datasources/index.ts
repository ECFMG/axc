import type { Domain } from '@axc/domain';
import { type DomainDataSource, DomainDataSourceImplementation } from './domain/index.ts';
import { type ReadonlyDataSource, ReadonlyDataSourceImplementation } from './readonly/index.ts';

type Course = Domain.Contexts.Catalog.Course.Course;

export type DataSources = {
	readonlyDataSource: ReadonlyDataSource;
	domainDataSource: DomainDataSource;
};

export const DataSourcesFactoryImpl = (courses: readonly Course[]): DataSources => {
	const enrollmentRequests: Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestSnapshot[] = [];
	return {
		readonlyDataSource: ReadonlyDataSourceImplementation(courses, enrollmentRequests),
		domainDataSource: DomainDataSourceImplementation(enrollmentRequests),
	};
};

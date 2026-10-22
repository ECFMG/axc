import { Domain } from '@axc/domain';
import { type ModelsContext, mongooseContextBuilder } from '@axc/service-mongoose';
import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { type DomainDataSource, DomainDataSourceImplementation } from './domain/index.ts';
import { type ReadonlyDataSource, ReadonlyDataSourceImplementation } from './readonly/index.ts';

export type { CourseReadModel, CourseSearchCriteria, CourseSortField, EnrollmentRequestReadModel, EnrollmentRequestSearchCriteria } from './readonly/index.ts';

export interface DataSources {
	domainDataSource: DomainDataSource;
	readonlyDataSource: ReadonlyDataSource;
}

export interface DataSourcesFactory {
	withPassport(passport: Domain.Contexts.Passport): DataSources;
	withSystemPassport(): DataSources;
}

const dataSourcesFactory = (models: ModelsContext): DataSourcesFactory => {
	const withPassport = (passport: Domain.Contexts.Passport): DataSources => ({
		domainDataSource: DomainDataSourceImplementation(models, passport),
		readonlyDataSource: ReadonlyDataSourceImplementation(models),
	});
	return { withPassport, withSystemPassport: () => withPassport(Domain.Contexts.PassportFactory.forSystem()) };
};

/** Builds the DataSourcesFactory from the started Mongoose infrastructure service (called in apps/api setContext). */
export const Persistence = (mongooseService: MongooseSeedwork.MongooseContextFactory): DataSourcesFactory => dataSourcesFactory(mongooseContextBuilder(mongooseService));

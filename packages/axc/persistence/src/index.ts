import * as Catalog from '@axc/data-sources-mongoose-models';
import type { Domain } from '@axc/domain';
import { createMemoryMongoServer } from '@axc/service-mongoose';
import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import mongoose from 'mongoose';
import { getCourseUnitOfWork } from './datasources/domain/course/course/course.uow.ts';
import { type ReadonlyDataSource, ReadonlyDataSourceImplementation } from './datasources/readonly/index.ts';

export type { UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';

export interface ModelsContext {
	Course: ReturnType<typeof Catalog.CourseModelFactory>;
}

export interface DataSources {
	domainDataSource: {
		Course: {
			Course: {
				CourseUnitOfWork: Domain.Contexts.Course.Course.CourseUnitOfWork;
			};
		};
	};
	readonlyDataSource: ReadonlyDataSource;
}

export interface DataSourcesFactory {
	withPassport: (passport: Domain.Passport) => DataSources;
}

const guestPassport = (): Domain.Passport => ({
	course: {
		forCourse: () => ({
			determineIf: (func) => func({ canManageCourse: true }),
		}),
	},
});

let catalog: Promise<DataSources> | undefined;

export const openCourseDataSources = (): Promise<DataSources> => {
	catalog ??= (async () => {
		const server = createMemoryMongoServer();
		await server.start();
		await mongoose.connect(server.getUri());
		const initialized: MongooseSeedwork.MongooseContextFactory = { service: mongoose };
		const models: ModelsContext = {
			Course: Catalog.CourseModelFactory(initialized),
		};
		if ((await models.Course.countDocuments().exec()) === 0) {
			await models.Course.insertMany(Catalog.courseSeed);
		}
		const passport = guestPassport();
		return {
			domainDataSource: {
				Course: {
					Course: {
						CourseUnitOfWork: getCourseUnitOfWork(models.Course, passport),
					},
				},
			},
			readonlyDataSource: ReadonlyDataSourceImplementation(models, passport),
		};
	})();
	return catalog;
};

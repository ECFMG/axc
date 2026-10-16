import type { Domain } from '@axc/domain';
import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { getCourseReadRepository, getEnrollmentRequestReadRepository, getEnrollmentRequestUnitOfWork } from './datasources/index.ts';
import { initializeTrainingModels } from './initialize-storage.ts';
import { getModels, type ModelsContext } from './models/index.ts';
export interface DataSources {
	readonlyDataSource: {
		Training: {
			Course: { CourseReadRepo: Domain.Contexts.Training.Course.CourseReadRepository };
			EnrollmentRequest: { EnrollmentRequestReadRepo: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestReadRepository };
		};
	};
	domainDataSource: {
		Training: { EnrollmentRequest: { EnrollmentRequestUnitOfWork: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork } };
	};
}
export class DataSourcesFactoryImpl {
	private readonly models: ModelsContext;
	constructor(context: MongooseSeedwork.MongooseContextFactory) {
		this.models = getModels(context);
	}
	async initialize(seed: boolean): Promise<void> {
		await initializeTrainingModels(this.models, seed);
	}
	getDataSources(): DataSources {
		return {
			readonlyDataSource: {
				Training: {
					Course: { CourseReadRepo: getCourseReadRepository(this.models) },
					EnrollmentRequest: { EnrollmentRequestReadRepo: getEnrollmentRequestReadRepository(this.models) },
				},
			},
			domainDataSource: { Training: { EnrollmentRequest: { EnrollmentRequestUnitOfWork: getEnrollmentRequestUnitOfWork(this.models) } } },
		};
	}
}

import type { Domain } from '@axc/domain';
import type { Repository } from '@cellix/domain-seedwork/repository';
import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { Readonly } from './datasources/index.ts';
import { Catalog as Models } from './models/index.ts';
import { Catalog as Seed } from './seed/index.ts';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export const Persistence = (initializedService: MongooseSeedwork.MongooseContextFactory): Domain.Contexts.Catalog.Course.DataSources => ({
	readonlyDataSource: { Catalog: { Course: { CourseReadRepository: Readonly.Catalog.Course.getCourseReadRepository(Models.getModels(initializedService)) } } },
});

export const seedCourses = Seed.seedCourses;

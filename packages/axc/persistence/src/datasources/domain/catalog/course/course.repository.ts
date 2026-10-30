import type { Course } from '@axc/data-sources-mongoose-models';
import { Domain } from '@axc/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import type { CourseDomainAdapter } from './course.domain-adapter.ts';

export class CourseRepository
	extends MongooseSeedwork.MongoRepositoryBase<Course, CourseDomainAdapter, Domain.Passport, Domain.Contexts.Catalog.Course.Course<CourseDomainAdapter>>
	implements Domain.Contexts.Catalog.Course.CourseRepository<CourseDomainAdapter>
{
	async getById(id: string): Promise<Domain.Contexts.Catalog.Course.Course<CourseDomainAdapter>> {
		const document = await this.model.findById(id).exec();
		if (!document) {
			throw new Error(`Course with id ${id} not found`);
		}
		return this.typeConverter.toDomain(document, this.passport);
	}

	getNewInstance(input: {
		title: string;
		summary: string;
		modality: 'online' | 'in-person' | 'hybrid';
		status: 'draft' | 'active' | 'retired';
		tags: string[];
	}): Promise<Domain.Contexts.Catalog.Course.Course<CourseDomainAdapter>> {
		const adapter = this.typeConverter.toAdapter(new this.model());
		return Promise.resolve(Domain.Contexts.Catalog.Course.Course.getNewInstance(adapter, input, this.passport));
	}
}

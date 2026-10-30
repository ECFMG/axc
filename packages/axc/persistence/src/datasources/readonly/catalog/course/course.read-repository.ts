import type { Course, CourseModelType } from '@axc/data-sources-mongoose-models';
import type { Domain } from '@axc/domain';
import type { FilterQuery } from 'mongoose';
import { CourseConverter } from '../../../domain/catalog/course/course.domain-adapter.ts';
import type { FindOneOptions, FindOptions } from '../../mongo-data-source.ts';
import { type CourseDataSource, CourseDataSourceImpl } from './course.data.ts';

export interface CourseReadRepository {
	getAll: (options?: FindOptions) => Promise<Domain.Contexts.Catalog.Course.CourseEntityReference[]>;
	getById: (id: string, options?: FindOneOptions) => Promise<Domain.Contexts.Catalog.Course.CourseEntityReference | null>;
	search: (command: { q?: string; modality?: string; status?: string; tag?: string; page?: number; pageSize?: number; sort?: string }) => Promise<Domain.Contexts.Catalog.Course.CourseEntityReference[]>;
}

export class CourseReadRepositoryImpl implements CourseReadRepository {
	private readonly mongoDataSource: CourseDataSource;
	private readonly converter: CourseConverter;
	private readonly passport: Domain.Passport;

	constructor(models: { Course: CourseModelType }, passport: Domain.Passport) {
		this.mongoDataSource = new CourseDataSourceImpl(models.Course);
		this.converter = new CourseConverter();
		this.passport = passport;
	}

	async getAll(options?: FindOptions): Promise<Domain.Contexts.Catalog.Course.CourseEntityReference[]> {
		const result = await this.mongoDataSource.find({}, options);
		return result.map((doc) => this.converter.toDomain(doc, this.passport));
	}

	async getById(id: string, options?: FindOneOptions): Promise<Domain.Contexts.Catalog.Course.CourseEntityReference | null> {
		const result = await this.mongoDataSource.findById(id, options);
		if (!result) {
			return null;
		}
		return this.converter.toDomain(result, this.passport);
	}

	async search(command: { q?: string; modality?: string; status?: string; tag?: string; page?: number; pageSize?: number; sort?: string }): Promise<Domain.Contexts.Catalog.Course.CourseEntityReference[]> {
		const clauses: Record<string, unknown>[] = [];
		if (command.modality !== undefined && command.modality !== '') {
			clauses.push({ modality: command.modality });
		}
		if (command.status !== undefined && command.status !== '') {
			clauses.push({ status: command.status });
		}
		const tag = command.tag?.trim();
		if (tag !== undefined && tag !== '') {
			clauses.push({ tags: { $regex: `^${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
		}
		const keyword = command.q?.trim();
		if (keyword !== undefined && keyword !== '') {
			const pattern = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			clauses.push({
				$or: [{ title: { $regex: pattern, $options: 'i' } }, { summary: { $regex: pattern, $options: 'i' } }, { tags: { $regex: pattern, $options: 'i' } }],
			});
		}
		let match: FilterQuery<Course> = {};
		const only = clauses[0];
		if (clauses.length === 1 && only !== undefined) {
			match = only as FilterQuery<Course>;
		} else if (clauses.length > 1) {
			match = { $and: clauses as FilterQuery<Course>[] };
		}
		const documents = await this.mongoDataSource.aggregate([{ $match: match }]);
		return documents.map((document) => this.converter.toDomain(document, this.passport));
	}
}

export const getCourseReadRepository = (models: { Course: CourseModelType }, passport: Domain.Passport): CourseReadRepositoryImpl => {
	return new CourseReadRepositoryImpl(models, passport);
};

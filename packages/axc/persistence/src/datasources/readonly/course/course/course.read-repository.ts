import type { Course, CourseModelType } from '@axc/data-sources-mongoose-models';
import type { Domain } from '@axc/domain';
import type { FilterQuery } from 'mongoose';
import { CourseConverter } from '../../../domain/course/course/course.domain-adapter.ts';
import type { FindOneOptions, FindOptions } from '../../mongo-data-source.ts';
import { type CourseDataSource, CourseDataSourceImpl } from './course.data.ts';

export interface CourseReadRepository {
	getAll: (options?: FindOptions) => Promise<Domain.Contexts.Course.Course.CourseEntityReference[]>;
	getById: (id: string, options?: FindOneOptions) => Promise<Domain.Contexts.Course.Course.CourseEntityReference | null>;
	search: (criteria: { q?: string; modality?: string; status?: string; tag?: string; page: number; pageSize: number; sort: 'title' | 'createdAt' | 'updatedAt' }) => Promise<{
		items: Domain.Contexts.Course.Course.CourseEntityReference[];
		totalItems: number;
	}>;
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

	async getAll(options?: FindOptions): Promise<Domain.Contexts.Course.Course.CourseEntityReference[]> {
		const result = await this.mongoDataSource.find({}, options);
		return result.map((doc) => this.converter.toDomain(doc, this.passport));
	}

	async search(criteria: { q?: string; modality?: string; status?: string; tag?: string; page: number; pageSize: number; sort: 'title' | 'createdAt' | 'updatedAt' }): Promise<{
		items: Domain.Contexts.Course.Course.CourseEntityReference[];
		totalItems: number;
	}> {
		const filter: FilterQuery<Course> = {};
		if (criteria.modality !== undefined) {
			filter.modality = criteria.modality;
		}
		if (criteria.status !== undefined) {
			filter.status = criteria.status;
		}
		if (criteria.tag !== undefined) {
			filter.tags = { $regex: `^${this.escapeRegex(criteria.tag)}$`, $options: 'i' };
		}
		if (criteria.q !== undefined) {
			const contains = { $regex: this.escapeRegex(criteria.q), $options: 'i' };
			filter.$or = [{ title: contains }, { summary: contains }, { tags: contains }];
		}
		const skip = (criteria.page - 1) * criteria.pageSize;
		const sort: FindOptions['sort'] = { [criteria.sort]: 1 };
		const [docs, totalItems] = await Promise.all([this.mongoDataSource.find(filter, { limit: criteria.pageSize, skip, sort }), this.mongoDataSource.count(filter)]);
		return {
			items: docs.map((doc) => this.converter.toDomain(doc, this.passport)),
			totalItems,
		};
	}

	private escapeRegex(value: string): string {
		return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	async getById(id: string, options?: FindOneOptions): Promise<Domain.Contexts.Course.Course.CourseEntityReference | null> {
		const result = await this.mongoDataSource.findById(id, options);
		if (!result) {
			return null;
		}
		return this.converter.toDomain(result, this.passport);
	}
}

export const getCourseReadRepository = (models: { Course: CourseModelType }, passport: Domain.Passport): CourseReadRepository => {
	return new CourseReadRepositoryImpl(models, passport);
};

import type { Course, CourseModelType } from '@axc/data-sources-mongoose-models';
import type { Domain } from '@axc/domain';
import { CourseConverter } from '../../../domain/course/course/course.domain-adapter.ts';
import type { FindOneOptions, FindOptions } from '../../mongo-data-source.ts';
import { type CourseDataSource, CourseDataSourceImpl } from './course.data.ts';

export interface CourseReadRepository {
	getAll: (options?: FindOptions) => Promise<Domain.Contexts.Course.Course.CourseEntityReference[]>;
	getById: (id: string, options?: FindOneOptions) => Promise<Domain.Contexts.Course.Course.CourseEntityReference | null>;
	query: (command: { q?: string; modality?: string; status?: string; tag?: string; page: number; pageSize: number; sort: 'title' | 'createdAt' | 'updatedAt' }) => Promise<{
		items: Array<{ id: string; title: string; summary: string; modality: string; status: string; tags: string[]; createdAt: string; updatedAt: string }>;
		page: number;
		pageSize: number;
		totalItems: number;
		totalPages: number;
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

	async getById(id: string, options?: FindOneOptions): Promise<Domain.Contexts.Course.Course.CourseEntityReference | null> {
		const result = await this.mongoDataSource.findById(id, options);
		if (!result) {
			return null;
		}
		return this.converter.toDomain(result, this.passport);
	}

	async query(command: { q?: string; modality?: string; status?: string; tag?: string; page: number; pageSize: number; sort: 'title' | 'createdAt' | 'updatedAt' }): Promise<{
		items: Array<{ id: string; title: string; summary: string; modality: string; status: string; tags: string[]; createdAt: string; updatedAt: string }>;
		page: number;
		pageSize: number;
		totalItems: number;
		totalPages: number;
	}> {
		const escapePattern = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const criteria: { modality?: string; status?: string; tags?: { $regex: string; $options: string }; $or?: Array<Record<string, { $regex: string; $options: string }>> } = {};
		if (command.modality !== undefined) criteria.modality = command.modality;
		if (command.status !== undefined) criteria.status = command.status;
		const tag = command.tag?.trim();
		if (tag) criteria.tags = { $regex: `^${escapePattern(tag)}$`, $options: 'i' };
		const keyword = command.q?.trim();
		if (keyword) {
			const pattern = escapePattern(keyword);
			criteria.$or = [{ title: { $regex: pattern, $options: 'i' } }, { summary: { $regex: pattern, $options: 'i' } }, { tags: { $regex: pattern, $options: 'i' } }];
		}
		const matched = await this.mongoDataSource.find(criteria as unknown as Partial<Course>);
		const sorted = [...matched].sort((left, right) => {
			if (command.sort === 'title') {
				const byTitle = left.title.localeCompare(right.title, 'en', { sensitivity: 'base' });
				if (byTitle !== 0) return byTitle;
			} else if (command.sort === 'createdAt') {
				const delta = left.createdAt.getTime() - right.createdAt.getTime();
				if (delta !== 0) return delta;
			} else {
				const delta = left.updatedAt.getTime() - right.updatedAt.getTime();
				if (delta !== 0) return delta;
			}
			return left.id.localeCompare(right.id);
		});
		const totalItems = sorted.length;
		const start = (command.page - 1) * command.pageSize;
		const items = sorted.slice(start, start + command.pageSize).map((doc) => ({
			id: doc.id,
			title: doc.title,
			summary: doc.summary,
			modality: doc.modality,
			status: doc.status,
			tags: [...doc.tags],
			createdAt: doc.createdAt.toISOString(),
			updatedAt: doc.updatedAt.toISOString(),
		}));
		return {
			items,
			page: command.page,
			pageSize: command.pageSize,
			totalItems,
			totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / command.pageSize),
		};
	}
}

export const getCourseReadRepository = (models: { Course: CourseModelType }, passport: Domain.Passport): CourseReadRepository => {
	return new CourseReadRepositoryImpl(models, passport);
};

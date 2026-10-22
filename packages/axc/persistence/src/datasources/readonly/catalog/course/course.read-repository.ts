import type { Models } from '@axc/service-mongoose';
import type { FilterQuery } from 'mongoose';
import { isObjectIdString } from '../../mongo-data-source.ts';
import type { CourseDataSource } from './course.data.ts';

type CourseModality = Models.Course.Course['modality'];
type CourseStatus = Models.Course.Course['status'];
export type CourseSortField = 'title' | 'createdAt' | 'updatedAt';

export interface CourseSearchCriteria {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSortField;
}

export interface CourseReadModel {
	id: string;
	title: string;
	summary: string;
	modality: CourseModality;
	status: CourseStatus;
	tags: string[];
	createdAt: Date;
	updatedAt: Date;
}

interface CourseReadRepository {
	search(criteria: CourseSearchCriteria): Promise<{ items: CourseReadModel[]; totalItems: number }>;
	getById(id: string): Promise<CourseReadModel | null>;
}

// Case-insensitive ordering, so "Accessible..." sorts before "AI Security..." as a reader expects.
const titleCollation = { locale: 'en', strength: 2 };

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toReadModel = (doc: Models.Course.Course): CourseReadModel => ({
	id: String(doc._id),
	title: doc.title,
	summary: doc.summary,
	modality: doc.modality,
	status: doc.status,
	tags: [...doc.tags],
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt,
});

export class CourseReadRepositoryImpl implements CourseReadRepository {
	private readonly dataSource: CourseDataSource;

	constructor(dataSource: CourseDataSource) {
		this.dataSource = dataSource;
	}

	async search(criteria: CourseSearchCriteria): Promise<{ items: CourseReadModel[]; totalItems: number }> {
		const filter: FilterQuery<Models.Course.Course> = {};
		if (criteria.q !== undefined) {
			const pattern = new RegExp(escapeRegExp(criteria.q), 'i');
			filter.$or = [{ title: pattern }, { summary: pattern }, { tags: pattern }];
		}
		if (criteria.modality !== undefined) {
			filter.modality = criteria.modality;
		}
		if (criteria.status !== undefined) {
			filter.status = criteria.status;
		}
		if (criteria.tag !== undefined) {
			// Tags are stored lowercase, so an exact lowercase match is a case-insensitive tag match.
			filter.tags = criteria.tag.toLowerCase();
		}
		const [docs, totalItems] = await Promise.all([
			this.dataSource.find(filter, { sort: { [criteria.sort]: 1, _id: 1 }, skip: (criteria.page - 1) * criteria.pageSize, limit: criteria.pageSize, collation: titleCollation }),
			this.dataSource.count(filter),
		]);
		return { items: docs.map(toReadModel), totalItems };
	}

	async getById(id: string): Promise<CourseReadModel | null> {
		if (!isObjectIdString(id)) {
			return null;
		}
		const [doc] = await this.dataSource.find({ _id: id }, { limit: 1 });
		return doc ? toReadModel(doc) : null;
	}
}

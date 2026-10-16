import type { Domain } from '@axc/domain';
import type { FilterQuery } from 'mongoose';
import type { CourseDocument } from '../../../../models/catalog/index.ts';
import type { ModelsContext } from '../../../../models/index.ts';
import { courseToDomain } from './course.domain-adapter.ts';

type CourseSearchCriteria = Domain.Contexts.Catalog.Course.CourseSearchCriteria;
export interface CourseReadRepository {
	search(criteria: CourseSearchCriteria): Promise<Domain.Contexts.Catalog.Course.CourseSearchResult>;
}

function escapeCourseSearchText(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function courseFilter(criteria: CourseSearchCriteria): FilterQuery<CourseDocument> {
	const filter: FilterQuery<CourseDocument> = {};
	if (criteria.modality !== undefined) {
		filter.modality = criteria.modality;
	}
	if (criteria.status !== undefined) {
		filter.status = criteria.status;
	}
	if (criteria.tag !== undefined) {
		filter.tags = new RegExp(`^${escapeCourseSearchText(criteria.tag)}$`, 'i');
	}
	if (criteria.q !== undefined) {
		const keyword = new RegExp(escapeCourseSearchText(criteria.q), 'i');
		filter.$or = [{ title: keyword }, { summary: keyword }, { tags: keyword }];
	}
	return filter;
}

export function getCourseReadRepository(models: ModelsContext): CourseReadRepository {
	return {
		async search(criteria) {
			const filter = courseFilter(criteria);
			const offset = (criteria.page - 1) * criteria.pageSize;
			const totalItems = await models.Catalog.Course.countDocuments(filter).exec();
			if (offset >= totalItems) {
				return { items: [], totalItems };
			}
			const documents = await models.Catalog.Course.find(filter)
				.sort({ [criteria.sort]: 1, courseId: 1 })
				.skip(offset)
				.limit(criteria.pageSize)
				.exec();
			return { items: documents.map(courseToDomain), totalItems };
		},
	};
}

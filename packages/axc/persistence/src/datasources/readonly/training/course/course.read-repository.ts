import type { Domain } from '@axc/domain';
import type { FilterQuery } from 'mongoose';
import type { CourseDocument, ModelsContext } from '../../../../models/index.ts';
import { courseToDomain } from './course.domain-adapter.ts';

function literalPattern(value: string): RegExp {
	return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}
export function getCourseReadRepository(models: ModelsContext): Domain.Contexts.Training.Course.CourseReadRepository {
	return {
		async getById(id) {
			const doc = await models.Course.findOne({ courseId: id }).exec();
			return doc === null ? null : courseToDomain(doc);
		},
		async search(criteria) {
			const filter: FilterQuery<CourseDocument> = {};
			if (criteria.q !== undefined) {
				const pattern = literalPattern(criteria.q);
				filter.$or = [{ title: pattern }, { summary: pattern }, { tags: pattern }];
			}
			if (criteria.modality !== undefined) {
				filter.modality = criteria.modality;
			}
			if (criteria.status !== undefined) {
				filter.status = criteria.status;
			}
			if (criteria.tag !== undefined) {
				const pattern = literalPattern(criteria.tag);
				filter.tags = new RegExp(`^${pattern.source}$`, 'i');
			}
			const [docs, totalItems] = await Promise.all([
				models.Course.find(filter)
					.sort({ [criteria.sort]: 1, courseId: 1 })
					.skip((criteria.page - 1) * criteria.pageSize)
					.limit(criteria.pageSize)
					.exec(),
				models.Course.countDocuments(filter).exec(),
			]);
			return { items: docs.map(courseToDomain), page: criteria.page, pageSize: criteria.pageSize, totalItems, totalPages: Math.ceil(totalItems / criteria.pageSize) };
		},
	};
}

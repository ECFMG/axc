import type { Domain } from '@axc/domain';
import type { FilterQuery } from 'mongoose';
import type { Course, CourseModelType } from '../../../../models/catalog/course.model.ts';

function literalRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type CourseReadRepository = Domain.Contexts.Catalog.Course.CourseReadRepository;

export const getCourseReadRepository = (models: { Course: CourseModelType }): CourseReadRepository => ({
	async search(criteria) {
		const filter: FilterQuery<Course> = {};
		if (criteria.modality !== undefined) {
			filter.modality = criteria.modality;
		}
		if (criteria.status !== undefined) {
			filter.status = criteria.status;
		}
		if (criteria.tag !== undefined) {
			filter.tags = { $regex: `^${literalRegex(criteria.tag)}$`, $options: 'i' };
		}
		if (criteria.q !== undefined) {
			const keyword = { $regex: literalRegex(criteria.q), $options: 'i' };
			filter.$or = [{ title: keyword }, { summary: keyword }, { tags: keyword }];
		}
		const totalItems = await models.Course.countDocuments(filter).exec();
		// Avoid constructing an out-of-range MongoDB skip for a valid, very large page.
		const documents =
			criteria.page > Math.ceil(totalItems / criteria.pageSize)
				? []
				: await models.Course.find(filter)
						.sort({ [criteria.sort]: 1, courseId: 1 })
						.skip((criteria.page - 1) * criteria.pageSize)
						.limit(criteria.pageSize)
						.exec();
		return {
			items: documents.map((document) => ({
				id: document.courseId,
				title: document.title,
				summary: document.summary,
				modality: document.modality,
				status: document.status,
				tags: [...document.tags],
				createdAt: document.createdAt.toISOString(),
				updatedAt: document.updatedAt.toISOString(),
			})),
			page: criteria.page,
			pageSize: criteria.pageSize,
			totalItems,
			totalPages: Math.ceil(totalItems / criteria.pageSize),
		};
	},
});

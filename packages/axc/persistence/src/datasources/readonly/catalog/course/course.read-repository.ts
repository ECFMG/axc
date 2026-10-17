import type { Domain } from '@axc/domain';
import type { FilterQuery } from 'mongoose';
import type { Course, CourseModelType } from '../../../../models/catalog/course.model.ts';

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const getCourseReadRepository = (models: { Course: CourseModelType }): Domain.Contexts.Catalog.Course.CourseReadRepository => ({
	async search(criteria) {
		const filter: FilterQuery<Course> = {};
		if (criteria.modality !== undefined) {
			filter.modality = criteria.modality;
		}
		if (criteria.status !== undefined) {
			filter.status = criteria.status;
		}
		if (criteria.tag !== undefined) {
			filter.tags = new RegExp(`^${escapeRegex(criteria.tag)}$`, 'i');
		}
		if (criteria.q !== undefined) {
			const keyword = new RegExp(escapeRegex(criteria.q), 'i');
			filter.$or = [{ title: keyword }, { summary: keyword }, { tags: keyword }];
		}
		const [documents, totalItems] = await Promise.all([
			models.Course.find(filter)
				.sort({ [criteria.sort]: 1, courseId: 1 })
				.skip((criteria.page - 1) * criteria.pageSize)
				.limit(criteria.pageSize)
				.lean()
				.exec(),
			models.Course.countDocuments(filter).exec(),
		]);
		const items = documents.map(
			(document): Domain.Contexts.Catalog.Course.CourseEntityReference => ({
				id: document.courseId,
				title: document.title,
				summary: document.summary,
				modality: document.modality,
				status: document.status,
				tags: document.tags,
				createdAt: document.createdAt.toISOString(),
				updatedAt: document.updatedAt.toISOString(),
			}),
		);
		return { items, page: criteria.page, pageSize: criteria.pageSize, totalItems, totalPages: Math.ceil(totalItems / criteria.pageSize) };
	},
});
